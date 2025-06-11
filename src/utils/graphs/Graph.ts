import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'

export type GraphNode = Token | NativeCurrency

type GetRate = (amountIn: bigint) => Promise<{
	rate: number // negative log of exchange rate
	amountOut: bigint
}>

export type GraphEdgeAction =
	| {
			type: 'SWAP'
			getRate: GetRate
	  }
	| {
			type: 'STARGATE_BRIDGE'
			getRate: GetRate
	  }
	| {
			type: 'FUSE_BRIDGE'
			getRate: GetRate
	  }

export interface GraphEdge {
	from: GraphNode
	to: GraphNode
	action: GraphEdgeAction
}

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

	constructor() {}

	addEdge(edge: GraphEdge) {
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

	addNode(node: GraphNode) {
		if (this.nodes.has(node)) {
			throw new GraphError(
				`Node ${node.chainId}:${node.address} already exists`,
			)
		}

		this.nodes.add(node)
	}
}
