import { Pool } from '../dex/Pool'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'

export type GraphNode = Token | NativeCurrency

export enum ActionType {
	SWAP = 'SWAP',
	STARGATE_BRIDGE = 'STARGATE_BRIDGE',
	FUSE_BRIDGE = 'FUSE_BRIDGE',
	WRAP = 'WRAP',
	UNWRAP = 'UNWRAP',
}

export type GetRate =
	| ((amountIn: bigint) => Promise<{
			rate: number // negative log of exchange rate
			amountOut: bigint
	  }>)
	| ((amountIn: bigint) => {
			rate: number // negative log of exchange rate
			amountOut: bigint
	  })

export type GraphEdgeAction = (
	| {
			type: ActionType.SWAP
			pool: Pool
	  }
	| {
			type: ActionType
	  }
) & {
	getRate: GetRate
}

export type GraphEdge = {
	from: GraphNode
	to: GraphNode
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
	nodes: Set<GraphNode> = new Set()
	private swapsCache: Map<string, bigint> = new Map()

	constructor() {}

	addEdge(edge: GraphEdge) {
		if (this.edges.has(edge)) {
			throw new GraphError(
				`Edge ${edge.from.chainId}:${edge.from.address} -> ${edge.to.chainId}:${edge.to.address} already exists`,
			)
		}

		if (!this.nodes.has(edge.from)) {
			throw new GraphError(
				`Node ${edge.from.chainId}:${edge.from.address} does not exist`,
			)
		}

		if (!this.nodes.has(edge.to)) {
			throw new GraphError(
				`Node ${edge.to.chainId}:${edge.to.address} does not exist`,
			)
		}

		this.edges.add(edge)
	}

	addSwapEdge(from: GraphNode, to: GraphNode, pool: Pool, slippage: number) {
		this.addEdge({
			from,
			to,
			type: ActionType.SWAP,
			pool,
			getRate: async (amountIn: bigint) => {
				const cacheKey = `${pool.address}/${from.chainId}:${from.address}-${to.chainId}:${to.address}:${amountIn.toString()}`
				const cachedAmount = this.swapsCache.get(cacheKey)

				if (cachedAmount) {
					const cachedRate = -Math.log(
						Number(cachedAmount) / Number(amountIn),
					)
					return {
						rate: cachedRate,
						amountOut: cachedAmount,
					}
				}

				const { amountOut } = await pool.quoteSwap({
					tokenIn: from,
					tokenOut: to,
					amountIn,
					slippage,
				})
				const rate = -Math.log(Number(amountOut) / Number(amountIn))

				// Cache the result
				this.swapsCache.set(cacheKey, amountOut)

				return {
					rate,
					amountOut,
				}
			},
		})
	}

	addNode(node: GraphNode) {
		if (this.nodes.has(node)) {
			throw new GraphError(
				`Node ${node.chainId}:${node.address} already exists`,
			)
		}

		this.nodes.add(node)
	}
}
