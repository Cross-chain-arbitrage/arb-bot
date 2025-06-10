import { Token } from '../../primitives/tokens/Token'

type TokenId = `${number}:${Address}`
type GraphNode = Token

type Exchangeable = boolean

type Edge = Exchangeable

export class BiDirectionalTokenGraphError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, BiDirectionalTokenGraphError.prototype)
		this.name = 'BiDirectionalTokenGraphError'
	}
}

export class BiDirectionalTokenGraph {
	// edges: Edge[] = []
	nodes: GraphNode[] = []
	adjacencyMatrix: Map<GraphNode, Map<GraphNode, Edge>> = new Map()

	constructor() {}

	addEdge(node1: GraphNode, node2: GraphNode) {
		if (!this.adjacencyMatrix.has(node1)) {
			throw new BiDirectionalTokenGraphError(
				`No such node ${this.tokenToId(node1)}`,
			)
		}

		if (!this.adjacencyMatrix.has(node2)) {
			throw new BiDirectionalTokenGraphError(
				`No such node ${this.tokenToId(node2)}`,
			)
		}

		const map = this.adjacencyMatrix.get(node1)!
		const edge = map.get(node2)

		if (edge) {
			throw new BiDirectionalTokenGraphError(
				`Edge already exist for nodes [${this.tokenToId(
					node1,
				)}, ${this.tokenToId(node2)}]`,
			)
		}

		map.set(node2, true)

		// Set for second direction
		const map2 = this.adjacencyMatrix.get(node2)!
		map2.set(node1, true)
	}

	addNode(node: GraphNode) {
		if (this.adjacencyMatrix.has(node)) {
			throw new BiDirectionalTokenGraphError(
				`Node ${this.tokenToId(node)} already exists`,
			)
		}

		this.adjacencyMatrix.set(node, new Map())
	}

	isCircular(): boolean {
		return false
	}

	tokenToId(token: Token): TokenId {
		return `${token.chainId}:${token.address}`
	}
}
