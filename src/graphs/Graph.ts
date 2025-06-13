import TTLCache from '@isaacs/ttlcache'
import { Stargate } from '../bridges/stargate/Stargate'
import { Pool } from '../dex/Pool'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { TokenId } from '../primitives/tokens/TokenBase'

export type GraphNode = Token | NativeCurrency

export enum ActionType {
	SWAP = 'SWAP',
	STARGATE_BRIDGE = 'STARGATE_BRIDGE',
	FUSE_BRIDGE = 'FUSE_BRIDGE',
	WRAP = 'WRAP',
	UNWRAP = 'UNWRAP',
}

export type GetRateResult = {
	rate: number // negative log of exchange rate
	amountOut: bigint
}

export type GetRate =
	| ((amountIn: bigint) => Promise<GetRateResult>)
	| ((amountIn: bigint) => GetRateResult)

export type GraphEdgeAction = (
	| {
			type: ActionType.SWAP
			pool: Pool
	  }
	| {
			type: Exclude<ActionType, ActionType.SWAP>
	  }
) & {
	getRate: GetRate
}

export type GraphNodeId = TokenId

export type GraphEdge = {
	from: GraphNodeId
	to: GraphNodeId
} & GraphEdgeAction

export class GraphError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, GraphError.prototype)
		this.name = 'GraphError'
	}
}

export class Graph {
	edges: Set<GraphEdge> = new Set()
	nodes: Map<GraphNodeId, GraphNode> = new Map()

	private swapCache: TTLCache<string, GetRateResult>

	constructor(swapCacheTTL: number = 1000 * 1) {
		this.swapCache = new TTLCache<string, GetRateResult>({
			ttl: swapCacheTTL,
		})
	}

	addEdge(edge: GraphEdge) {
		const from = this.nodes.get(edge.from)
		const to = this.nodes.get(edge.to)

		if (!from) {
			throw new GraphError(`Node ${edge.from} does not exist`)
		}

		if (!to) {
			throw new GraphError(`Node ${edge.to} does not exist`)
		}

		if (this.edges.has(edge)) {
			throw new GraphError(
				`Edge ${from.toString()} -> ${to.toString()} already exists`,
			)
		}

		this.edges.add(edge)
	}

	addSwapEdge(fromId: TokenId, toId: TokenId, pool: Pool, slippage: number) {
		const from = this.getToken(fromId)
		const to = this.getToken(toId)

		if (from.isNative()) {
			throw new GraphError('Cannot add swap edge with native token')
		}

		if (to.isNative()) {
			throw new GraphError('Cannot add swap edge with native token')
		}

		this.addEdge({
			from,
			to,
			type: ActionType.SWAP,
			pool,
			getRate: async (amountIn: bigint) => {
				const cacheKey = this.getSwapCacheKey(from, to, pool, amountIn)
				const cachedResult = this.swapCache.get(cacheKey)

				if (cachedResult) return cachedResult

				const { amountOut } = await pool.quoteSwap({
					tokenIn: from,
					tokenOut: to,
					amountIn,
					slippage,
				})
				const rate = this.calcRate(amountIn, amountOut)

				// Cache the result
				this.swapCache.set(cacheKey, {
					rate,
					amountOut,
				})

				return {
					rate,
					amountOut,
				}
			},
		})
	}

	addNode(node: GraphNode) {
		if (this.nodes.has(node.id)) {
			throw new GraphError(`Node ${node.id} already exists`)
		}

		this.nodes.set(node.id, node)
	}

	addStargateBridgeEdge(from: GraphNode, to: GraphNode) {
		const getRate = async (amountIn: bigint) => {
			const quote = await Stargate.quote(from, to.chainId, amountIn)

			const amountOut = Stargate.getExpectedAmountOut(quote, amountIn)

			const rate = this.calcRate(amountIn, amountOut)

			return {
				rate,
				amountOut,
			}
		}

		this.addEdge({
			from: from.id,
			to: to.id,
			type: ActionType.STARGATE_BRIDGE,
			getRate,
		})
	}

	private getSwapCacheKey(
		from: GraphNode,
		to: GraphNode,
		pool: Pool,
		amountIn: bigint,
	) {
		return `${from.chainId}:${from.address}-${to.chainId}:${to.address}:${ActionType.SWAP}:${pool.address}:${amountIn.toString()}`
	}

	private calcRate(amountIn: bigint, amountOut: bigint) {
		return -Math.log(Number(amountOut) / Number(amountIn))
	}

	getToken(tokenId: TokenId): GraphNode {
		const token = this.nodes.get(tokenId)

		if (!token) {
			throw new GraphError(`Token ${tokenId} does not exist`)
		}

		return token
	}
}
