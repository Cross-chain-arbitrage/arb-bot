import { createCustomError } from '../utils/common'
import { Edge, FuseBridgeEdge, StargateBridgeEdge } from './primitives/Edge'
import { Graph } from './primitives/Graph'

const GraphOpportunityFinderError = createCustomError(
	'GraphOpportunityFinderError',
)

export class GraphOpportunityFinder {
	/**
	 * Finds an arbitrage path using the Bellman-Ford algorithm
	 * @param startToken - The token to start the arbitrage from
	 * @param startAmount - The amount of tokens to start with
	 * @param graph - The graph containing all possible trading paths
	 * @param maxDepth - Maximum number of edges to traverse (default: 7)
	 * @returns Object containing the arbitrage path and edge rates
	 */
	static async findArbOpportunity(
		startToken: GraphNode,
		startAmount: bigint,
		graph: Graph,
		maxDepth: number = 7,
	): Promise<GraphArbitrageOpportunity | null> {
		const distances = new Map<GraphNodeId, number>()
		const predecessors = new Map<GraphNodeId, Edge>()
		const amounts = new Map<GraphNodeId, bigint>()

		// Initialize
		distances.set(startToken.id, 0)
		amounts.set(startToken.id, startAmount)

		// Run Bellman-Ford
		for (let i = 0; i < maxDepth; i++) {
			const quotes: {
				quote: Promise<GetRateResult>
				edge: Edge
			}[] = []

			for (const [edgeId, edge] of graph.edges) {
				const from = edge.from

				const currentAmount = amounts.get(from.id)
				const fromDistance = distances.get(from.id)

				if (!currentAmount) continue
				if (fromDistance === undefined) continue

				quotes.push({
					quote: edge.getRate(currentAmount),
					edge,
				})
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			const quotePromises = quotes.map(({ quote }) => quote)
			await Promise.all(quotePromises)

			for (const { quote, edge } of quotes) {
				const from = edge.from
				const to = edge.to

				const { rate, amountOut } = await quote

				const fromTo = `${from.toString()} -> ${to.toString()}`

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
						const arbitrageOpportunity =
							await this.reconstructCycle(
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
	 * @param graph - The graph containing all possible trading paths
	 * @param predecessors - Map of token IDs to their predecessor edges
	 * @param startToken - The token where the cycle starts and ends
	 * @param startAmount - The initial amount of tokens
	 * @returns The reconstructed arbitrage path with profit calculations
	 */
	private static async reconstructCycle(
		predecessors: Map<GraphNodeId, Edge>,
		startToken: GraphNode,
		startAmount: bigint,
	): Promise<GraphArbitrageOpportunity> {
		const edges: Edge[] = []
		let currentToken: GraphNodeId = startToken.id
		const maxEdges = 10 // Safety limit to prevent infinite loops
		let bridgesCount = 0

		// Reconstruct the cycle by following predecessors
		do {
			const edge = predecessors.get(currentToken)

			if (!edge) {
				throw new Error(
					'Invalid cycle: missing edge in predecessors map',
				)
			}

			edges.push(edge)
			currentToken = edge.from.id

			if (edges.length > maxEdges) {
				throw new GraphOpportunityFinderError(
					'Cycle length is too long. Probably a loop appeared on path',
				)
			}

			if (
				edge instanceof StargateBridgeEdge ||
				edge instanceof FuseBridgeEdge
			) {
				bridgesCount++
			}

			if (bridgesCount > 2) {
				throw new GraphOpportunityFinderError(
					'Too many bridges in the cycle',
				)
			}
		} while (currentToken !== startToken.id)

		// Reverse the edges to get the correct order
		edges.reverse()

		// Calculate amounts and profit

		let amount = startAmount
		for (const edge of edges) {
			const { amountOut } = await edge.getRate(amount)
			amount = amountOut
		}

		const profitAmount = amount - startAmount
		const profitPercentage =
			(Number(profitAmount) / Number(startAmount)) * 100

		return {
			path: edges,
			startAmount,
			endAmount: amount,
			profitAmount,
			profitPercentage,
		}
	}
}
