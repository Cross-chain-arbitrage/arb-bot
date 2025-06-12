import { parseUnits } from 'viem'
import { GetRate, Graph, GraphEdge, GraphNode } from './Graph'
import { EdgeWithRate } from './visualization'

interface ArbitragePath {
	edges: GraphEdge[]
	startAmount: bigint
	endAmount: bigint
	profitAmount: bigint
	profitPercentage: number
}

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
	const distances = new Map<GraphNode, number>()
	const predecessors = new Map<GraphNode, GraphEdge>()
	const amounts = new Map<GraphNode, bigint>()

	// Initialize
	distances.set(startToken, 0)
	amounts.set(startToken, startAmount)

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

		const quotePromises = quotes.map(({ quote }) => quote)
		await Promise.all(quotePromises)

		for (const { quote, edge } of quotes) {
			const from = edge.from
			const to = edge.to

			const { rate, amountOut } = await quote

			const fromTo = `${from.chainId}:${from.address} -> ${to.chainId}:${to.address}`

			edgesWithRate.set(fromTo, {
				rate,
				from,
				to,
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
				if (to === startToken && newDist < 0) {
					const path = await reconstructCycle(
						predecessors,
						startToken,
						startAmount,
					)

					return {
						path,
						edgesWithRate,
					}
				}
			}
		}
	}
	console.log('')
	console.timeEnd('Bellman-Ford Algorithm')
	console.log('')

	return { path: null, edgesWithRate }
}

async function reconstructCycle(
	predecessors: Map<GraphNode, GraphEdge>,
	startToken: GraphNode,
	startAmount: bigint,
): Promise<ArbitragePath> {
	const edges: GraphEdge[] = []
	let currentToken = startToken

	// Reconstruct the cycle by following predecessors
	do {
		const edge = predecessors.get(currentToken)!
		edges.push(edge)
		currentToken = edge.from
	} while (currentToken !== startToken)

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
