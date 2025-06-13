import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Pool } from '../dex/Pool'
import { Token } from '../primitives/tokens/Token'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import { ClientManager } from '../utils/ClientManager'
import { shortenAddress } from '../utils/common'
import logger from '../utils/logger'
import { ActionType, GraphEdge } from './Graph'
import { ArbitragePath } from './path'
export class Executor {
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

		let inputAmount = startAmount

		for (const edge of edges) {
			const { from, to } = edge
			const { amountOut, dstTxHash, srcTxHash } = await this.executeEdge(
				edge,
				inputAmount,
			)

			inputAmount = amountOut

			const baseLogMsg = `${edge.type} from: ${from.symbol}-${from.chainId} to:${to.symbol}-${to.chainId} input:${from.formatUnits(inputAmount)} output:${to.formatUnits(amountOut)}`
			const logMsg =
				srcTxHash === dstTxHash
					? `${baseLogMsg} tx:${dstTxHash}`
					: `${baseLogMsg} srcTxHash:${srcTxHash} dstTxHash:${dstTxHash} `

			logger.info(logMsg)
		}

		return inputAmount //actual end amount
	}

	static async executeEdge(edge: GraphEdge, inputAmount: bigint) {
		switch (edge.type) {
			case ActionType.SWAP:
				return await this.executeSwap(edge, inputAmount)

			// case ActionType.STARGATE_BRIDGE:
			// 	await this.executeStargateBridge(edge, inputAmount)
			// 	break
			case ActionType.FUSE_BRIDGE:
				return await this.executeFuseBridge(edge, inputAmount)

			case ActionType.WRAP:
				return await this.executeWrap(edge, inputAmount)

			case ActionType.UNWRAP:
				return await this.executeUnwrap(edge, inputAmount)

			default:
				throw new Error(`Unknown edge type: ${edge.type}`)
		}
	}

	static async executeSwap(
		edge: GraphEdge & {
			type: ActionType.SWAP
			pool: Pool
		},
		inputAmount: bigint,
	) {
		const { pool, from, to } = edge

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
			amountIn: inputAmount,
			tokenIn: from,
			tokenOut: to,
		})

		return {
			amountOut,
			srcTxHash: receipt.transactionHash,
			dstTxHash: receipt.transactionHash,
		}
	}

	static async executeWrap(edge: GraphEdge, inputAmount: bigint) {
		const { to } = edge

		if (!(to instanceof WrappedNative)) {
			throw new Error(
				`Cannot wrap non-WETH token: ${to.symbol} ${to.chainId} ${shortenAddress(to.address)}`,
			)
		}

		const receipt = await to.deposit(inputAmount)

		// output amount is the same as input amount
		return {
			amountOut: inputAmount,
			srcTxHash: receipt.transactionHash,
			dstTxHash: receipt.transactionHash,
		}
	}

	static async executeUnwrap(edge: GraphEdge, inputAmount: bigint) {
		const { from } = edge

		if (!(from instanceof WrappedNative)) {
			throw new Error(
				`Cannot unwrap non-WETH token: ${from.symbol} ${from.chainId} ${shortenAddress(from.address)}`,
			)
		}

		const receipt = await from.withdraw(inputAmount)

		// output amount is the same as input amount
		return {
			amountOut: inputAmount,
			srcTxHash: receipt.transactionHash,
			dstTxHash: receipt.transactionHash,
		}
	}

	static async executeFuseBridge(edge: GraphEdge, inputAmount: bigint) {
		const { from, to } = edge

		const tx = await FuseBridge.bridge(
			from as Token,
			to.chainId,
			ClientManager.getWalletClient(to.chainId).account!.address,
			inputAmount,
		)

		const message = await tx.waitForBridgeToFinish()

		// output amount is the same as input amount
		// TODO: retrieve amount out from dst tx, because decimals could be different
		return {
			amountOut: inputAmount,
			srcTxHash: message.srcTxHash!,
			dstTxHash: message.dstTxHash!,
		}
	}

	// static async executeStargateBridge(
	// 	edge: GraphEdge & {
	// 		type: ActionType.STARGATE_BRIDGE
	// 	},
	// 	inputAmount: bigint,
	// ) {
	// 	const { from, to } = edge

	// 	const tx = await Stargate.bridge(
	// 		from,
	// 		to.chainId,
	// 		to.address,
	// 		inputAmount,
	// 	)

	// 	await tx.waitForBridgeToFinish()

	// 	return tx.amount
	// }
}
