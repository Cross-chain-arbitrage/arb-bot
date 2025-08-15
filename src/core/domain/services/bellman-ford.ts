import { createCustomError } from '../../../utils/common'
import { Edge, Quote } from '../entities/edge'
import { Graph } from '../entities/graph'
import { Node, NodeId } from '../entities/node'

const GraphOpportunityFinderError = createCustomError(
	'GraphOpportunityFinderError',
)

export interface GraphArbitrageOpportunity {
	path: { edge: Edge; quote: Quote }[]
	startAmount: bigint
}

export class BellmanFord {
	/**
	 * Finds an arbitrage path using the Bellman-Ford algorithm
	 * @dev Tries to find negative sum cyclic path of graph traversal
	 * @param startToken - The token to start the arbitrage from
	 * @param startAmount - The amount of tokens to start with
	 * @param graph - The graph containing all possible trading paths
	 * @returns - {@link GraphArbitrageOpportunity} or null, if no opportunity found
	 */
	static async findNegativeSumCycle(
		startToken: Node,
		startAmount: bigint,
		graph: Graph,
	): Promise<GraphArbitrageOpportunity | null> {
		const distances = new Map<GraphNodeId, number>()
		const predecessors = new Map<GraphNodeId, Edge>()
		const amounts = new Map<GraphNodeId, bigint>()

		// Initialize
		distances.set(startToken.id, 0)
		amounts.set(startToken.id, startAmount)

		// Run Bellman-Ford
		for (let i = 0; i < graph.nodes.size; i++) {
			const quotes: {
				quote: Quote
				edge: Edge
			}[] = []

			for (const [, edge] of graph.edges) {
				const from = edge.from

				const currentAmount = amounts.get(from.id)
				const fromDistance = distances.get(from.id)

				if (!currentAmount) continue
				if (fromDistance === undefined) continue

				quotes.push({
					quote: edge.getQuote(currentAmount),
					edge,
				})
			}

			const quotePromises = quotes.map(({ quote }) => quote)
			await Promise.all(quotePromises)

			for (const { quote, edge } of quotes) {
				const from = edge.from
				const to = edge.to

				const { rate, amountOut } = quote

				const fromDistance = distances.get(from.id)
				if (fromDistance === undefined) continue

				const newDist = fromDistance + rate

				const toDistance = distances.get(to.id) ?? Infinity

				if (newDist < toDistance) {
					distances.set(to.id, newDist)

					predecessors.set(to.id, edge)

					amounts.set(to.id, amountOut)

					// Check for negative cycle
					const isCyclic = to.id === startToken.id // It means we've came back to the start token
					const isNegative = newDist < 0 // It means we're in profit!

					if (isCyclic && isNegative) {
						const arbitrageOpportunity = this.reconstructCycle(
							predecessors,
							startToken,
							startAmount,
						)

						return arbitrageOpportunity
					}
				}
			}
		}

		return null
	}

	/**
	 * Reconstructs a profitable trading cycle from the predecessors map
	 * @param predecessors - Map of token IDs to their predecessor edges
	 * @param startToken - The token where the cycle starts and ends
	 * @param startAmount - The initial amount of tokens
	 * @returns The reconstructed arbitrage path with profit calculations
	 */
	private static reconstructCycle(
		predecessors: Map<NodeId, Edge>,
		startToken: Node,
		startAmount: bigint,
	): GraphArbitrageOpportunity {
		const edges: Edge[] = []
		let currentToken: NodeId = startToken.id

		// Reconstruct the cycle by following predecessors
		do {
			const edge = predecessors.get(currentToken)

			if (!edge) {
				throw new GraphOpportunityFinderError(
					'Missing edge in predecessors map',
				)
			}

			edges.push(edge)
			currentToken = edge.from.id
		} while (currentToken !== startToken.id)

		// Reverse the edges to get the correct order
		edges.reverse()

		// Calculate amounts and profit

		const path: { edge: Edge; quote: Quote }[] = []

		let amount = startAmount

		for (const edge of edges) {
			const quote = edge.getQuote(amount)
			amount = quote.amountOut
			path.push({ edge, quote: edge.getQuote(amount) })
		}

		return {
			path,
			startAmount,
		}
	}
}
