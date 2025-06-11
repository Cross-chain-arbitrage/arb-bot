import { parseUnits } from 'viem'
import { Graph, GraphEdge, GraphNode } from './Graph'

interface ArbitragePath {
	edges: GraphEdge[]
	startAmount: bigint
	endAmount: bigint
	profit: number
}

export async function findArbitragePath(
	startToken: GraphNode,
	startAmount: bigint,
	graph: Graph,
	maxDepth: number = 8,
): Promise<ArbitragePath | null> {
	const distances = new Map<GraphNode, number>()
	const predecessors = new Map<GraphNode, GraphEdge>()
	const amounts = new Map<GraphNode, bigint>()

	// Initialize
	distances.set(startToken, 0)
	amounts.set(startToken, startAmount)

	// Run Bellman-Ford
	for (let i = 0; i < maxDepth; i++) {
		for (const edge of graph.edges) {
			const fromId = edge.from
			const to = edge.to

			const currentAmount = amounts.get(fromId)!
			const { rate, amountOut } = await edge.action.getRate(currentAmount)

			const newDist = distances.get(fromId)! + rate

			if (newDist < (distances.get(to) ?? Infinity)) {
				distances.set(to, newDist)
				predecessors.set(to, edge)
				amounts.set(to, amountOut)

				// Check for negative cycle
				if (to === startToken && newDist < 0) {
					return reconstructCycle(
						predecessors,
						startToken,
						startAmount,
					)
				}
			}
		}
	}

	return null
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
		const path = await findArbitragePath(
			startToken,
			amount,
			graph,
			maxDepth,
		)
		if (path && (!bestPath || path.profit > bestPath.profit)) {
			bestPath = path
		}
	}

	return bestPath
}

async function reconstructCycle(
	predecessors: Map<GraphNode, GraphEdge>,
	startToken: GraphNode,
	startAmount: bigint,
): Promise<ArbitragePath> {
	const edges: GraphEdge[] = []
	let currentToken = startToken

	let endAmount = BigInt(0)

	// Reconstruct the cycle by following predecessors
	do {
		const edge = predecessors.get(currentToken)!
		edges.push(edge)
		currentToken = edge.from
	} while (currentToken !== startToken)

	// Reverse the edges to get the correct order
	edges.reverse()

	// Calculate amounts and profit

	endAmount = (await edges[edges.length - 1].action.getRate(startAmount))
		.amountOut
	const profit = (Number(endAmount - startAmount) / Number(startAmount)) * 100

	return {
		edges,
		startAmount,
		endAmount,
		profit,
	}
}
