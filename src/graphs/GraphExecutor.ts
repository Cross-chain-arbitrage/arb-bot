import { Hash, TransactionReceipt } from 'viem'
import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Stargate } from '../bridges/stargate/Stargate'
import { PriceOracle } from '../modules/PriceOracle/PriceOracle'
import { Token } from '../primitives/tokens/Token'
import { TokenAmount } from '../primitives/tokens/TokenAmount'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import { ClientManager } from '../utils/ClientManager'
import { runFnWithRetry, shortenAddress } from '../utils/common'
import logger from '../utils/logger'
import {
	ActionType,
	Edge,
	FuseBridgeEdge,
	StargateBridgeEdge,
	SwapEdge,
	UnwrapEdge,
	WrapEdge,
} from './primitives/Edge'

export interface GraphExecutorConfig {
	path: Edge[]
	startAmount: bigint
	retryExecuteEdgeCount: number
	beforeExecuteEdgeHook?: (
		path: Edge[],
		currentEdge: Edge,
		amountIn: bigint,
	) => unknown
	afterExecuteEdgeHook?: (
		path: Edge[],
		currentEdge: Edge,
		amountOut: bigint,
	) => unknown
}

type ExecutionResult<T extends ActionType> = {
	amountOut: bigint
	actionType: T
} & (T extends BridgeActionType
	? {
			srcTxReceipt: TransactionReceipt
			bridgeFee: TokenAmount
			dstTxHash: Hash
		}
	: {
			txReceipt: TransactionReceipt
		})

export class GraphExecutor {
	/**
	 * Execute the arbitrage path
	 * @returns actual end amount
	 */
	static async execute(config: GraphExecutorConfig) {
		const {
			path,
			startAmount,
			retryExecuteEdgeCount,
			beforeExecuteEdgeHook,
			afterExecuteEdgeHook,
		} = config

		let nextAmountIn = startAmount
		let totalTxsCostInUsd = 0

		for (const edge of path) {
			const { from, to } = edge

			await beforeExecuteEdgeHook?.(path, edge, nextAmountIn)

			const beforeExecuteLogMsg = `Start ${edge.actionType} from: ${from.toString()} to:${to.toString()} input:${from.formatUnits(nextAmountIn)}}`
			logger.info(beforeExecuteLogMsg)

			const executionResult = await runFnWithRetry(
				() => this.executeEdge(edge, nextAmountIn),
				retryExecuteEdgeCount,
			)

			const { executionCostInUsd } = await this.handleExecutionResult(
				edge,
				executionResult,
			)

			totalTxsCostInUsd += executionCostInUsd

			await afterExecuteEdgeHook?.(path, edge, executionResult.amountOut)

			nextAmountIn = executionResult.amountOut
		}

		return {
			actualEndAmount: nextAmountIn,
			totalTxsCostInUsd,
		}
	}

	/**
	 * build and print log and calculate tx cost
	 */
	static async handleExecutionResult(
		edge: Edge,
		executionResult: ExecutionResult<ActionType>,
	) {
		let executionResultLogMsg = `\n┌─ ${edge.actionType} COMPLETED ─────────────────────\n`
		executionResultLogMsg += `│ Output Amount: ${edge.to.formatUnits(executionResult.amountOut)} ${edge.to.symbol}\n`

		let botTxReceipt
		let executionCostInUsd = 0
		if (
			executionResult.actionType === ActionType.STARGATE_BRIDGE ||
			executionResult.actionType === ActionType.FUSE_BRIDGE
		) {
			const { srcTxReceipt, dstTxHash, bridgeFee } =
				executionResult as ExecutionResult<BridgeActionType>

			const bridgeFeeTokenPrice = await PriceOracle.getPrice(
				bridgeFee.underlyingToken,
			)

			const bridgeFeeInUsd =
				Number(bridgeFee.formatUnits(bridgeFee.amount)) *
				bridgeFeeTokenPrice

			executionCostInUsd += bridgeFeeInUsd

			executionResultLogMsg += `│ Source Tx:     ${srcTxReceipt.transactionHash}\n`
			executionResultLogMsg += `│ Destination Tx: ${dstTxHash}\n`
			executionResultLogMsg += `│ Bridge Fee:    ${bridgeFee.formatUnits(bridgeFee.amount)} ${bridgeFee.symbol} (~$${bridgeFeeInUsd.toFixed(2)})\n`

			botTxReceipt = srcTxReceipt
		} else {
			const { txReceipt } =
				executionResult as ExecutionResult<InchainActionType>

			executionResultLogMsg += `│ Transaction:   ${txReceipt.transactionHash}\n`

			botTxReceipt = txReceipt
		}

		const { nativeCurrency, txCostInNative, txCostInUsd } =
			await this.getTxCost(edge.from.chainId, botTxReceipt)

		executionCostInUsd += txCostInUsd

		executionResultLogMsg += `│ Gas Cost:      ${nativeCurrency.formatUnits(txCostInNative)} ${nativeCurrency.symbol} (~$${txCostInUsd.toFixed(2)})\n`
		executionResultLogMsg += `└────────────────────────────────────────────────────\n`

		logger.info(executionResultLogMsg)

		return {
			executionCostInUsd,
			txCostInNative,
		}
	}

	static async getTxCost(chainId: number, txReceipt: TransactionReceipt) {
		const nativeCurrency = TokenUtils.getNative(chainId)

		const txCostInNative = txReceipt.gasUsed * txReceipt.effectiveGasPrice

		const txCostInNativeFormatted =
			nativeCurrency.formatUnits(txCostInNative)

		const nativePrice = await PriceOracle.getPrice(nativeCurrency)

		const txCostInUsd = Number(txCostInNativeFormatted) * nativePrice

		return {
			nativeCurrency,
			txCostInNative,
			txCostInUsd,
		}
	}

	static async executeEdge(
		edge: Edge,
		amountIn: bigint,
	): Promise<ExecutionResult<typeof edge.actionType>> {
		switch (edge.actionType) {
			case ActionType.SWAP:
				return await this.executeSwap(edge as SwapEdge, amountIn)

			case ActionType.STARGATE_BRIDGE:
				return await this.executeStargateBridge(edge, amountIn)

			case ActionType.FUSE_BRIDGE:
				return await this.executeFuseBridge(edge, amountIn)

			case ActionType.WRAP:
				return await this.executeWrap(edge as WrapEdge, amountIn)

			case ActionType.UNWRAP:
				return await this.executeUnwrap(edge as UnwrapEdge, amountIn)
		}
	}

	static async executeSwap(edge: SwapEdge, amountIn: bigint) {
		const { from, to } = edge
		const { pool } = edge

		if (from.isNative()) {
			throw new Error(
				`Cannot swap from native currency: ${from.symbol} ${from.chainId} ${shortenAddress(from.address)}`,
			)
		}

		if (to.isNative()) {
			throw new Error(
				`Cannot swap to native currency: ${to.symbol} ${to.chainId} ${shortenAddress(to.address)}`,
			)
		}

		const { amountOut, receipt } = await pool.swap({
			amountIn: amountIn,
			tokenIn: from,
			tokenOut: to,
		})

		return {
			amountOut,
			txReceipt: receipt,
			actionType: ActionType.SWAP,
		}
	}

	static async executeWrap(edge: WrapEdge, amountIn: bigint) {
		const { to } = edge

		if (!(to instanceof WrappedNative)) {
			throw new Error(
				`Cannot wrap non-WETH token: ${to.symbol} ${to.chainId} ${shortenAddress(to.address)}`,
			)
		}

		const receipt = await to.deposit(amountIn)

		// output amount is the same as input amount
		return {
			amountOut: amountIn,
			txReceipt: receipt,
			actionType: ActionType.WRAP,
		}
	}

	static async executeUnwrap(edge: UnwrapEdge, amountIn: bigint) {
		const { from } = edge

		if (!(from instanceof WrappedNative)) {
			throw new Error(
				`Cannot unwrap non-WETH token: ${from.symbol} ${from.chainId} ${shortenAddress(from.address)}`,
			)
		}

		const receipt = await from.withdraw(amountIn)

		// output amount is the same as input amount
		return {
			amountOut: amountIn,
			txReceipt: receipt,
			actionType: ActionType.UNWRAP,
		}
	}

	static async executeFuseBridge(edge: FuseBridgeEdge, amountIn: bigint) {
		const { from, to } = edge
		const { bridgeTx, lzFee } = await FuseBridge.bridge(
			from as Token,
			to.chainId,
			ClientManager.getWalletClient(to.chainId).account.address,
			amountIn,
		)

		const srcTxReceipt = await ClientManager.getClient(
			from.chainId,
		).waitForTransactionReceipt({ hash: bridgeTx.srcTxHash as Hash })

		const message = await bridgeTx.waitForBridgeToFinish()

		// output amount is the same as input amount
		// TODO: retrieve amount out from dst tx, because decimals could be different
		return {
			amountOut: amountIn,
			srcTxReceipt,
			dstTxHash: message.dstTxHash as Hash,
			actionType: ActionType.FUSE_BRIDGE,
			bridgeFee: lzFee,
		}
	}

	static async executeStargateBridge(
		edge: StargateBridgeEdge,
		amountIn: bigint,
	) {
		const { from, to } = edge

		const fromChainId = from.chainId
		const fromAddress = from.address
		const toChainId = to.chainId

		const fromToken = await TokenUtils.fromAddress(fromAddress, fromChainId)

		const result = await Stargate.bridge(
			fromToken,
			toChainId,
			ClientManager.getWalletClient(fromChainId).account.address,
			amountIn,
		)

		const srcTxReceipt = await ClientManager.getClient(
			fromChainId,
		).waitForTransactionReceipt({
			hash: result.bridgeTx.srcTxHash as Hash,
		})

		const message = await result.bridgeTx.waitForBridgeToFinish()

		return {
			amountOut: result.amountOut,
			srcTxReceipt,
			dstTxHash: message.dstTxHash as Hash,
			actionType: ActionType.STARGATE_BRIDGE,
			bridgeFee: result.lzFee,
		}
	}
}
