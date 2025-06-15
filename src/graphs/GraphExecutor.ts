import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Stargate } from '../bridges/stargate/Stargate'
import { Pool } from '../dex/Pool'
import { Token } from '../primitives/tokens/Token'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import { ClientManager } from '../utils/ClientManager'
import { shortenAddress } from '../utils/common'
import logger from '../utils/logger'
import { ActionType, GraphEdge } from './Graph'
import { ArbitragePath } from './path'
import { getEdgeNodes } from './utils'

export class GraphExecutor {
	/**
	 * Execute the arbitrage path
	 * @returns actual end amount
	 */
	static async execute(arbitragePath: ArbitragePath) {
		const {
			edges,
			startAmount,
			endAmount,
			profitAmount,
			profitPercentage,
		} = arbitragePath

		let amountIn = startAmount

		for (const edge of edges) {
			const { from, to } = await getEdgeNodes(edge)

			const beforeExecuteLogMsg = `Start ${edge.type} from: ${from.symbol}-${from.chainId} to:${to.symbol}-${to.chainId} input:${from.formatUnits(amountIn)}}`
			logger.info(beforeExecuteLogMsg)
			const { amountOut, dstTxHash, srcTxHash } = await this.executeEdge(
				edge,
				amountIn,
			)

			const afterExecuteLogMsg =
				srcTxHash === dstTxHash
					? `End ${edge.type} amountOut:${to.formatUnits(amountOut)} ${beforeExecuteLogMsg} tx:${dstTxHash}`
					: `End ${edge.type} amountOut:${to.formatUnits(amountOut)} ${beforeExecuteLogMsg} srcTxHash:${srcTxHash} dstTxHash:${dstTxHash} `

			logger.info(afterExecuteLogMsg)

			amountIn = amountOut
		}

		return amountIn //actual end amount
	}

	static async executeEdge(
		edge: GraphEdge,
		amountIn: bigint,
	): Promise<{
		amountOut: bigint
		srcTxHash: string
		dstTxHash: string
	}> {
		switch (edge.type) {
			case ActionType.SWAP:
				return await this.executeSwap(edge, amountIn)

			case ActionType.STARGATE_BRIDGE:
				return await this.executeStargateBridge(edge, amountIn)

			case ActionType.FUSE_BRIDGE:
				return await this.executeFuseBridge(edge, amountIn)

			case ActionType.WRAP:
				return await this.executeWrap(edge, amountIn)

			case ActionType.UNWRAP:
				return await this.executeUnwrap(edge, amountIn)
		}
	}

	static async executeSwap(
		edge: GraphEdge & {
			type: ActionType.SWAP
			pool: Pool
		},
		amountIn: bigint,
	) {
		const { from, to } = await getEdgeNodes(edge)
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

	static async executeWrap(edge: GraphEdge, amountIn: bigint) {
		const { to } = await getEdgeNodes(edge)

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

	static async executeUnwrap(edge: GraphEdge, amountIn: bigint) {
		const { from } = await getEdgeNodes(edge)

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

	static async executeFuseBridge(edge: GraphEdge, amountIn: bigint) {
		const { from, to } = await getEdgeNodes(edge)

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

	static async executeStargateBridge(edge: GraphEdge, amountIn: bigint) {
		const { from, to } = edge

		const fromChainId = Number(from.split(':')[0])
		const fromAddress = from.split(':')[1] as Address
		const toChainId = Number(to.split(':')[0])

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
