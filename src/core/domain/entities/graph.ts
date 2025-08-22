import { Edge, EdgeId } from './edge'
import { Node, NodeId } from './node'

export class GraphError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, GraphError.prototype)
		this.name = 'GraphError'
	}
}

export class Graph<T extends object = object> {
	edges: Map<EdgeId, Edge> = new Map()
	nodes: Map<NodeId, Node<T>> = new Map()

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
			throw new GraphError(`Edge ${from.id} -> ${to.id} already exists`)
		}

		this.edges.set(edge.id, edge)
	}

	addNode(node: Node<T>) {
		if (this.nodes.has(node.id)) {
			throw new GraphError(`Node ${node.id} already exists`)
		}

		this.nodes.set(node.id, node)
	}

	isNodeAdded(nodeId: NodeId): boolean {
		return this.nodes.has(nodeId)
	}
}
