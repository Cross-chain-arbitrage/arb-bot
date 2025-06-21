import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Stargate } from '../bridges/stargate/Stargate'
import { Token } from '../primitives/tokens/Token'
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
	retryExecuteEdgeCount?: number
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
			retryExecuteEdgeCount = 1,
			beforeExecuteEdgeHook,
			afterExecuteEdgeHook,
		} = config

		let amountIn = startAmount

		for (const edge of path) {
			const { from, to } = edge

			await beforeExecuteEdgeHook?.(path, edge, amountIn)

			const beforeExecuteLogMsg = `Start ${edge.actionType} from: ${from.toString()} to:${to.toString()} input:${from.formatUnits(amountIn)}}`
			logger.info(beforeExecuteLogMsg)

			const { amountOut, dstTxHash, srcTxHash } = await runFnWithRetry(
				() => this.executeEdge(edge, amountIn),
				retryExecuteEdgeCount,
			)

			const afterExecuteLogMsg =
				srcTxHash === dstTxHash
					? `End ${edge.actionType} amountOut:${to.formatUnits(amountOut)} ${beforeExecuteLogMsg} tx:${dstTxHash}`
					: `End ${edge.actionType} amountOut:${to.formatUnits(amountOut)} ${beforeExecuteLogMsg} srcTxHash:${srcTxHash} dstTxHash:${dstTxHash} `

			logger.info(afterExecuteLogMsg)

			await afterExecuteEdgeHook?.(path, edge, amountOut)

			amountIn = amountOut
		}

		return amountIn //actual end amount
	}

	static async executeEdge(
		edge: Edge,
		amountIn: bigint,
	): Promise<{
		amountOut: bigint
		srcTxHash: string
		dstTxHash: string
	}> {
		// TODO: implement type guard for edge
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
			srcTxHash: receipt.transactionHash,
			dstTxHash: receipt.transactionHash,
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
			srcTxHash: receipt.transactionHash,
			dstTxHash: receipt.transactionHash,
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
			srcTxHash: receipt.transactionHash,
			dstTxHash: receipt.transactionHash,
		}
	}

	static async executeFuseBridge(edge: FuseBridgeEdge, amountIn: bigint) {
		const { from, to } = edge
		const tx = await FuseBridge.bridge(
			from as Token,
			to.chainId,
			ClientManager.getWalletClient(to.chainId).account!.address,
			amountIn,
		)

		const message = await tx.waitForBridgeToFinish()

		// output amount is the same as input amount
		// TODO: retrieve amount out from dst tx, because decimals could be different
		return {
			amountOut: amountIn,
			srcTxHash: message.srcTxHash!,
			dstTxHash: message.dstTxHash!,
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
			ClientManager.getWalletClient(fromChainId).account!.address,
			amountIn,
		)

		const message = await result.bridgeTx.waitForBridgeToFinish()

		return {
			amountOut: result.expectedAmountOut,
			srcTxHash: message.srcTxHash!,
			dstTxHash: message.dstTxHash!,
		}
	}
}
