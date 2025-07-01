import TTLCache from '@isaacs/ttlcache'
import { Pool } from '../../dex/base/Pool'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ActionType, Edge, SwapEdge } from './Edge'

export class GraphError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, GraphError.prototype)
		this.name = 'GraphError'
	}
}

export class Graph {
	edges: Map<EdgeId, Edge<ActionType>> = new Map()
	nodes: Map<GraphNodeId, GraphNode> = new Map()

	private edgeCache: TTLCache<string, GetRateResult>

	constructor(edgeCacheTTL: number = 1000 * 1) {
		this.edgeCache = new TTLCache<string, GetRateResult>({
			ttl: edgeCacheTTL,
		})
	}

	addEdge(edge: Edge) {
		const from = this.nodes.get(edge.from.id)
		const to = this.nodes.get(edge.to.id)

		if (!TokenUtils.isValidTokenId(edge.from.id)) {
			throw new GraphError(`Invalid token id: ${edge.from.id}`)
		}

		if (!TokenUtils.isValidTokenId(edge.to.id)) {
			throw new GraphError(`Invalid token id: ${edge.to.id}`)
		}

		if (!from) {
			throw new GraphError(`Node ${edge.from.id} does not exist`)
		}

		if (!to) {
			throw new GraphError(`Node ${edge.to.id} does not exist`)
		}

		if (this.edges.has(edge.id)) {
			throw new GraphError(
				`Edge ${from.toString()} -> ${to.toString()} already exists`,
			)
		}

		this.edges.set(edge.id, edge)
	}

	/**
	 * Add a pool to the graph
	 * @param pool - The pool to add
	 * @dev Adds two edges for the pool, one for each direction
	 * @dev Adds Nodes for tokens if they are not present
	 */
	addDexPool(pool: Pool) {
		const from = pool.token0
		const to = pool.token1

		if (!this.isNodeAdded(from.id)) {
			this.addNode(from)
		}
		if (!this.isNodeAdded(to.id)) {
			this.addNode(to)
		}

		this.addEdge(new SwapEdge(from, to, pool, this))
		this.addEdge(new SwapEdge(to, from, pool, this))

		// this._addDexPoolEdge(pool, slippage)
	}

	getCachedEdgeRate(edgeId: string) {
		return this.edgeCache.get(edgeId)
	}

	cacheEdgeRate(edgeId: string, rate: GetRateResult) {
		this.edgeCache.set(edgeId, rate)
	}

	addNode(node: GraphNode) {
		if (this.nodes.has(node.id)) {
			throw new GraphError(`Node ${node.id} already exists`)
		}

		this.nodes.set(node.id, node)
	}

	getToken(tokenId: TokenId): GraphNode {
		const token = this.nodes.get(tokenId)

		if (!token) {
			throw new GraphError(`Token ${tokenId} does not exist`)
		}

		return token
	}

	isNodeAdded(tokenId: TokenId): boolean {
		return this.nodes.has(tokenId)
	}
}
