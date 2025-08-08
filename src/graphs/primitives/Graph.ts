import { Edge } from './edges/edge'

export class GraphError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, GraphError.prototype)
		this.name = 'GraphError'
	}
}

export class Graph {
	edges: Map<EdgeId, Edge> = new Map()
	nodes: Map<GraphNodeId, GraphNode> = new Map()

	constructor() {}

	addEdge(edge: Edge) {
		const from = this.nodes.get(edge.from.id)
		const to = this.nodes.get(edge.to.id)

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

	addNode(node: GraphNode) {
		if (this.nodes.has(node.id)) {
			throw new GraphError(`Node ${node.id} already exists`)
		}

		this.nodes.set(node.id, node)
	}

	getToken(tokenId: EdgeId): GraphNode {
		const token = this.nodes.get(tokenId)

		if (!token) {
			throw new GraphError(`Token ${tokenId} does not exist`)
		}

		return token
	}

	isNodeAdded(tokenId: EdgeId): boolean {
		return this.nodes.has(tokenId)
	}
}
