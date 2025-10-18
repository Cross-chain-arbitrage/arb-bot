import { Edge } from '../entities/edge'
import { Graph } from '../entities/graph'
import { Node, NodeId } from '../entities/node'

export class GraphUtils {
	/**
	 * Finds all unique routes from source to target node using depth-first search.
	 * When from equals to, finds cycles. Prevents immediate backtracking (A->B->A is forbidden, but A->B->C->A is allowed).
	 */
	static getAllRoutes(graph: Graph, from: Node, to: Node): Edge[][] {
		const routes: Edge[][] = []
		const isCycleSearch = from.id === to.id

		const depthFirstSearch = (
			currentNode: Node,
			path: Edge[],
			visitedNodes: Set<NodeId>,
		) => {
			if (!isCycleSearch && currentNode.id === to.id) {
				routes.push([...path])
				return
			}

			if (isCycleSearch && path.length > 0 && currentNode.id === to.id) {
				routes.push([...path])
				return
			}

			const outgoingEdges = Array.from(graph.edges.values()).filter(
				(edge) => edge.from.id === currentNode.id,
			)

			for (const edge of outgoingEdges) {
				const nextNode = edge.to
				const previousNode =
					path.length > 0 ? path[path.length - 1].from : null

				if (previousNode && nextNode.id === previousNode.id) {
					continue
				}

				if (isCycleSearch && nextNode.id === to.id && path.length > 0) {
					visitedNodes.add(nextNode.id)
					path.push(edge)
					depthFirstSearch(nextNode, path, visitedNodes)
					path.pop()
					visitedNodes.delete(nextNode.id)
					continue
				}

				if (visitedNodes.has(nextNode.id)) {
					continue
				}

				visitedNodes.add(nextNode.id)
				path.push(edge)

				depthFirstSearch(nextNode, path, visitedNodes)

				path.pop()
				visitedNodes.delete(nextNode.id)
			}
		}

		const initialVisited = new Set<NodeId>([from.id])
		depthFirstSearch(from, [], initialVisited)

		return routes
	}
}
