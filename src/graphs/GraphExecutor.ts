import { TransactionReceipt } from 'viem'
import { PriceOracle } from '../modules/PriceOracle/PriceOracle'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { runFnWithRetry } from '../utils/common'
import logger from '../utils/logger'
import { ActionType, Edge } from './primitives/Edge'

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
				() => edge.execute(nextAmountIn),
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
		executionResult: EdgeExecutionResult<ActionType>,
	) {
		let executionResultLogMsg = `\n┌─ ${edge.actionType} COMPLETED ─────────────────────\n`
		executionResultLogMsg += `│ Output Amount: ${edge.to.formatUnits(executionResult.amountOut)} ${edge.to.symbol}\n`

		let botTxReceipt
		let executionCostInUsd = 0
		if (
			edge.actionType === ActionType.STARGATE_BRIDGE ||
			edge.actionType === ActionType.FUSE_BRIDGE
		) {
			const { srcTxReceipt, dstTxHash, bridgeFee } =
				executionResult as EdgeExecutionResult<BridgeActionType>

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
				executionResult as EdgeExecutionResult<InchainActionType>

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

		let txCostInNative = 0n
		try {
			// viem returns not bigint for one of the values (probably effectiveGasPrice)
			txCostInNative = txReceipt.gasUsed * txReceipt.effectiveGasPrice
		} catch (error) {
			logger.error(
				`Error calculating tx cost in native for tx ${txReceipt.transactionHash}, gasUsed: ${txReceipt.gasUsed}, effectiveGasPrice: ${txReceipt.effectiveGasPrice}`,
				error,
			)
		}

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
}
