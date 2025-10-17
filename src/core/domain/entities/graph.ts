import { EdgeId } from '../value-objects/edge-id'
import { Edge } from './edge'
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
		const from = this.getNode(edge.from.id)
		const to = this.getNode(edge.to.id)

		if (!from) {
			throw new GraphError(`Node ${edge.from.id} does not exist`)
		}

		if (!to) {
			throw new GraphError(`Node ${edge.to.id} does not exist`)
		}

		if (this.isEdgeAdded(edge.id)) {
			throw new GraphError(`Edge ${from.id} -> ${to.id} already exists`)
		}

		this.edges.set(edge.id.toLowerCase() as EdgeId, edge)
	}

	getEdge(edgeId: EdgeId): Edge | undefined {
		return this.edges.get(edgeId.toLowerCase() as EdgeId)
	}

	getNode(nodeId: NodeId): Node<T> | undefined {
		return this.nodes.get(nodeId.toLowerCase())
	}

	addNode(node: Node<T>) {
		if (this.isNodeAdded(node.id)) {
			throw new GraphError(`Node ${node.id} already exists`)
		}

		this.nodes.set(node.id.toLowerCase(), node)
	}

	isNodeAdded(nodeId: NodeId): boolean {
		return this.nodes.has(nodeId.toLowerCase())
	}

	isEdgeAdded(edgeId: EdgeId): boolean {
		return this.edges.has(edgeId.toLowerCase() as EdgeId)
	}
}
