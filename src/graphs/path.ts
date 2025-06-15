import { parseUnits } from 'viem'
import { GetRate, Graph, GraphEdge, GraphNode, GraphNodeId } from './Graph'
import { EdgeWithRate } from './visualization'

/**
 * Represents an arbitrage path with its edges and profit metrics
 */
export interface ArbitragePath {
	edges: GraphEdge[]
	startAmount: bigint
	endAmount: bigint
	profitAmount: bigint
	profitPercentage: number
}

/**
 * Finds an arbitrage path using the Bellman-Ford algorithm
 * @param startToken - The token to start the arbitrage from
 * @param startAmount - The amount of tokens to start with
 * @param graph - The graph containing all possible trading paths
 * @param maxDepth - Maximum number of edges to traverse (default: 7)
 * @returns Object containing the arbitrage path and edge rates
 */
export async function findArbitragePath(
	startToken: GraphNode,
	startAmount: bigint,
	graph: Graph,
	maxDepth: number = 7,
): Promise<{
	path: ArbitragePath | null
	edgesWithRate: Map<string, EdgeWithRate>
}> {
	console.time('Bellman-Ford Algorithm')

	const distances = new Map<GraphNodeId, number>()
	const predecessors = new Map<GraphNodeId, GraphEdge>()
	const amounts = new Map<GraphNodeId, bigint>()

	// Initialize
	distances.set(startToken.id, 0)
	amounts.set(startToken.id, startAmount)

	const edgesWithRate = new Map<string, EdgeWithRate>()

	// Run Bellman-Ford
	for (let i = 0; i < maxDepth; i++) {
		const quotes: {
			quote: ReturnType<GetRate>
			edge: GraphEdge
		}[] = []

		for (const edge of graph.edges) {
			const from = edge.from

			const currentAmount = amounts.get(from)
			const fromDistance = distances.get(from)

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

			edgesWithRate.set(fromTo, {
				rate,
				from: graph.getToken(from),
				to: graph.getToken(to),
			})

			const fromDistance = distances.get(from)
			if (fromDistance === undefined) continue

			const newDist = fromDistance + rate

			const toDistance = distances.get(to) ?? Infinity

			if (newDist < toDistance) {
				distances.set(to, newDist)

				predecessors.set(to, edge)

				amounts.set(to, amountOut)

				// Check for negative cycle
				const isCyclic = to === startToken.id // It means we've came back to the start token
				const isNegative = newDist < 0 // It means we're in profit!

				if (isCyclic && isNegative) {
					const path = await reconstructCycle(
						graph,
						predecessors,
						startToken,
						startAmount,
					)

					console.timeEnd('Bellman-Ford Algorithm')

					return {
						path,
						edgesWithRate,
					}
				}
			}
		}
	}

	console.log('\n')
	console.timeEnd('Bellman-Ford Algorithm')
	console.log('\n')

	return { path: null, edgesWithRate }
}

/**
 * Reconstructs a profitable trading cycle from the predecessors map
 * @param graph - The graph containing all possible trading paths
 * @param predecessors - Map of token IDs to their predecessor edges
 * @param startToken - The token where the cycle starts and ends
 * @param startAmount - The initial amount of tokens
 * @returns The reconstructed arbitrage path with profit calculations
 */
async function reconstructCycle(
	graph: Graph,
	predecessors: Map<GraphNodeId, GraphEdge>,
	startToken: GraphNode,
	startAmount: bigint,
): Promise<ArbitragePath> {
	const edges: GraphEdge[] = []
	let currentToken: GraphNodeId = startToken.id
	console.log('\nstartToken', startToken.toString())
	const maxEdges = 10 // Safety limit to prevent infinite loops

	// Reconstruct the cycle by following predecessors
	do {
		const edge = predecessors.get(currentToken)

		if (!edge) {
			throw new Error('Invalid cycle: missing edge in predecessors map')
		}

		const from = graph.getToken(edge.from)
		const to = graph.getToken(edge.to)

		console.log(`${from.toString()} -- ${edge.type} --> ${to.toString()}`)
		// const { rate } = await edge.getRate(startAmount)
		// console.log('Rate: ', rate.toFixed(3))

		edges.push(edge)
		currentToken = edge.from

		if (edges.length > maxEdges) {
			throw new Error('Invalid cycle: too many edges')
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
	const profitPercentage = (Number(profitAmount) / Number(startAmount)) * 100

	return {
		edges,
		startAmount,
		endAmount: amount,
		profitAmount,
		profitPercentage,
	}
}

/**
 * Finds the optimal arbitrage path by trying different starting amounts
 * @param startToken - The token to start the arbitrage from
 * @param graph - The graph containing all possible trading paths
 * @param maxDepth - Maximum number of edges to traverse (default: 4)
 * @returns The most profitable arbitrage path found, or null if none exists
 */
export async function findOptimalArbitrage(
	startToken: GraphNode,
	graph: Graph,
	maxDepth: number = 4,
): Promise<ArbitragePath | null> {
	// Try different starting amounts
	const amounts = [
		parseUnits('1000', 18), // $1000
		parseUnits('5000', 18), // $5000
		parseUnits('10000', 18), // $10000
	]

	let bestPath: ArbitragePath | null = null

	for (const amount of amounts) {
		const { path } = await findArbitragePath(
			startToken,
			amount,
			graph,
			maxDepth,
		)
		if (path && (!bestPath || path.profitAmount > bestPath.profitAmount)) {
			bestPath = path
		}
	}

	return bestPath
}
