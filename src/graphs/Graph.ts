import { Stargate } from '../bridges/stargate/Stargate'
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
			type: Exclude<ActionType, ActionType.SWAP>
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

	private getRateCache: Map<
		string,
		{
			rate: number
			amountOut: bigint
		}
	> = new Map()

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
				const cacheKey = this.getSwapCacheKey(from, to, pool, amountIn)
				const cachedResult = this.getRateCache.get(cacheKey)

				if (cachedResult) return cachedResult

				const { amountOut } = await pool.quoteSwap({
					tokenIn: from,
					tokenOut: to,
					amountIn,
					slippage,
				})
				const rate = this.calcRate(amountIn, amountOut)

				// Cache the result
				this.getRateCache.set(cacheKey, {
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
		if (this.nodes.has(node)) {
			throw new GraphError(
				`Node ${node.chainId}:${node.address} already exists`,
			)
		}

		this.nodes.add(node)
	}

	addStargateBridgeEdge(from: GraphNode, to: GraphNode) {
		const getRate = async (amountIn: bigint) => {
			const cacheKey = this.getCacheKey(
				{ from, to, type: ActionType.STARGATE_BRIDGE },
				amountIn,
			)
			const cachedResult = this.getRateCache.get(cacheKey)

			if (cachedResult) {
				console.log('\nCached getRate call result')
				return cachedResult
			}

			console.log('\nGetting rate for stargate bridge edge\n')
			console.log(`from: ${from.symbol} (${from.chainId})	`)
			console.log(`to: ${to.symbol} (${to.chainId})`)
			console.log(
				`amountIn: ${from.formatUnits(amountIn)} ${from.symbol}`,
			)

			const quote = await Stargate.quote(from, to.chainId, amountIn)

			if (quote.oftFees) {
				console.log('has OFT fees')
				const amountOut = quote.oftFees.oftReceipt.amountReceivedLD

				const rate = this.calcRate(amountIn, amountOut)

				console.log(
					`amountOut: ${to.formatUnits(amountOut)} ${to.symbol}`,
				)
				console.log(`rate: ${rate}`)

				this.getRateCache.set(cacheKey, {
					rate,
					amountOut,
				})

				return {
					rate,
					amountOut,
				}
			} else {
				console.log("doesn't have OFT fees")

				const amountOut = amountIn
				const rate = this.calcRate(amountIn, amountOut)

				console.log(
					`amountOut: ${to.formatUnits(amountOut)} ${to.symbol}`,
				)
				console.log(`rate: ${rate}`)

				this.getRateCache.set(cacheKey, {
					rate,
					amountOut,
				})

				return {
					rate,
					amountOut,
				}
			}
		}

		this.addEdge({
			from,
			to,
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

	private getCacheKey(edge: Omit<GraphEdge, 'getRate'>, amountIn: bigint) {
		if (edge.type === ActionType.SWAP) {
			throw new GraphError(
				'Use other getSwapCacheKey to get cache key for swap edge',
			)
		}

		const { from, to, type } = edge

		return `${from.chainId}:${from.address}-${to.chainId}:${to.address}:${type}:${amountIn.toString()}`
	}

	private calcRate(amountIn: bigint, amountOut: bigint) {
		return -Math.log(Number(amountOut) / Number(amountIn))
	}
}
