import { Edge } from '../../../../src/core/domain/entities/edge'
import { Graph } from '../../../../src/core/domain/entities/graph'
import { Node } from '../../../../src/core/domain/entities/node'
import { GraphUtils } from '../../../../src/core/domain/services/graph-utils'
import { EdgeId } from '../../../../src/core/domain/value-objects/edge-id'

const addNode = (graph: Graph, id: string): Node => {
	const node: Node = { id }
	graph.addNode(node)
	return node
}

const addEdge = (graph: Graph, from: Node, to: Node): Edge => {
	const edge: Edge = {
		id: `${from.id}->${to.id}` as EdgeId,
		from,
		to,
	}
	graph.addEdge(edge)
	return edge
}

describe('GraphUtils', () => {
	describe('getAllRoutes', () => {
		describe('graph A <-> B <-> C <-> D <-> A', () => {
			let graph: Graph
			let nodeA: Node
			let nodeB: Node
			let nodeC: Node
			let nodeD: Node

			beforeEach(() => {
				graph = new Graph()

				nodeA = addNode(graph, 'A')
				nodeB = addNode(graph, 'B')
				nodeC = addNode(graph, 'C')
				nodeD = addNode(graph, 'D')

				addEdge(graph, nodeA, nodeB)
				addEdge(graph, nodeB, nodeA)
				addEdge(graph, nodeB, nodeC)
				addEdge(graph, nodeC, nodeB)
				addEdge(graph, nodeC, nodeD)
				addEdge(graph, nodeD, nodeC)
				addEdge(graph, nodeD, nodeA)
				addEdge(graph, nodeA, nodeD)
			})

			it('should return 2 routes from A to A: A-B-C-D-A and A-D-C-B-A', () => {
				const routes = GraphUtils.getAllRoutes(graph, nodeA, nodeA)

				expect(routes).toHaveLength(2)

				const routeIds = routes.map((route) =>
					route.map((edge) => edge.id),
				)

				expect(routeIds).toContainEqual([
					'A->B',
					'B->C',
					'C->D',
					'D->A',
				])
				expect(routeIds).toContainEqual([
					'A->D',
					'D->C',
					'C->B',
					'B->A',
				])
			})

			it('should return 2 routes from C to A', () => {
				const routes = GraphUtils.getAllRoutes(graph, nodeC, nodeA)

				expect(routes).toHaveLength(2)

				const routeIds = routes.map((route) =>
					route.map((edge) => edge.id),
				)

				expect(routeIds).toContainEqual(['C->B', 'B->A'])
				expect(routeIds).toContainEqual(['C->D', 'D->A'])
			})
		})

		describe('graph A <-> B <-> C <-> D <-> A + B <-> D', () => {
			let graph: Graph
			let nodeA: Node
			let nodeB: Node
			let nodeC: Node
			let nodeD: Node

			beforeEach(() => {
				graph = new Graph()

				nodeA = addNode(graph, 'A')
				nodeB = addNode(graph, 'B')
				nodeC = addNode(graph, 'C')
				nodeD = addNode(graph, 'D')

				addEdge(graph, nodeA, nodeB)
				addEdge(graph, nodeB, nodeA)
				addEdge(graph, nodeB, nodeC)
				addEdge(graph, nodeC, nodeB)
				addEdge(graph, nodeC, nodeD)
				addEdge(graph, nodeD, nodeC)
				addEdge(graph, nodeD, nodeA)
				addEdge(graph, nodeA, nodeD)
				addEdge(graph, nodeB, nodeD)
				addEdge(graph, nodeD, nodeB)
			})

			it('should return 4 routes from A to A', () => {
				const routes = GraphUtils.getAllRoutes(graph, nodeA, nodeA)

				expect(routes).toHaveLength(4)

				const routeIds = routes.map((route) =>
					route.map((edge) => edge.id),
				)

				expect(routeIds).toContainEqual([
					'A->B',
					'B->C',
					'C->D',
					'D->A',
				])
				expect(routeIds).toContainEqual(['A->B', 'B->D', 'D->A'])
				expect(routeIds).toContainEqual(['A->D', 'D->B', 'B->A'])
				expect(routeIds).toContainEqual([
					'A->D',
					'D->C',
					'C->B',
					'B->A',
				])
			})

			it('should return 4 routes from C to A', () => {
				const routes = GraphUtils.getAllRoutes(graph, nodeC, nodeA)

				expect(routes).toHaveLength(4)

				const routeIds = routes.map((route) =>
					route.map((edge) => edge.id),
				)

				expect(routeIds).toContainEqual(['C->B', 'B->A'])
				expect(routeIds).toContainEqual(['C->B', 'B->D', 'D->A'])
				expect(routeIds).toContainEqual(['C->D', 'D->A'])
				expect(routeIds).toContainEqual(['C->D', 'D->B', 'B->A'])
			})
		})

		describe('graph A <-> E <-> F <-> A <-> B <-> C <-> D <-> A', () => {
			let graph: Graph
			let nodeA: Node
			let nodeB: Node
			let nodeC: Node
			let nodeD: Node
			let nodeE: Node
			let nodeF: Node

			beforeEach(() => {
				graph = new Graph()

				nodeA = addNode(graph, 'A')
				nodeB = addNode(graph, 'B')
				nodeC = addNode(graph, 'C')
				nodeD = addNode(graph, 'D')
				nodeE = addNode(graph, 'E')
				nodeF = addNode(graph, 'F')

				addEdge(graph, nodeA, nodeE)
				addEdge(graph, nodeE, nodeA)
				addEdge(graph, nodeE, nodeF)
				addEdge(graph, nodeF, nodeE)
				addEdge(graph, nodeF, nodeA)
				addEdge(graph, nodeA, nodeF)
				addEdge(graph, nodeA, nodeB)
				addEdge(graph, nodeB, nodeA)
				addEdge(graph, nodeB, nodeC)
				addEdge(graph, nodeC, nodeB)
				addEdge(graph, nodeC, nodeD)
				addEdge(graph, nodeD, nodeC)
				addEdge(graph, nodeD, nodeA)
				addEdge(graph, nodeA, nodeD)
			})

			it('should return 4 routes from A to A', () => {
				const routes = GraphUtils.getAllRoutes(graph, nodeA, nodeA)

				expect(routes).toHaveLength(4)

				const routeIds = routes.map((route) =>
					route.map((edge) => edge.id),
				)

				expect(routeIds).toContainEqual(['A->E', 'E->F', 'F->A'])
				expect(routeIds).toContainEqual(['A->F', 'F->E', 'E->A'])
				expect(routeIds).toContainEqual([
					'A->B',
					'B->C',
					'C->D',
					'D->A',
				])
				expect(routeIds).toContainEqual([
					'A->D',
					'D->C',
					'C->B',
					'B->A',
				])
			})

			it('should return 2 routes from C to A', () => {
				const routes = GraphUtils.getAllRoutes(graph, nodeC, nodeA)

				expect(routes).toHaveLength(2)

				const routeIds = routes.map((route) =>
					route.map((edge) => edge.id),
				)

				expect(routeIds).toContainEqual(['C->B', 'B->A'])
				expect(routeIds).toContainEqual(['C->D', 'D->A'])
			})
		})
	})
})
