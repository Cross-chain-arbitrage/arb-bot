import { Graph, GraphNode } from '../graphs/Graph'
import { ArbitragePath, findArbitragePath } from '../graphs/path'
import { EdgeWithRate } from '../graphs/visualization'

const DEFAULT_OPTIONS = {
	initialValueUSD: 15,
	stepUSD: 15,
	stepsAmount: 22,
	maxPathLength: 7,
}

export class GraphOptimizer {
	static async findOpportunity(
		startToken: GraphNode,
		startTokenUSDPrice: number,
		graph: Graph,
		options: GraphOptimizerOptions = {},
	): Promise<{
		path: ArbitragePath | null
		edgesWithRate: Map<string, EdgeWithRate>
	}> {
		const { initialValueUSD, stepUSD, stepsAmount, maxPathLength } = {
			...DEFAULT_OPTIONS,
			...options,
		}

		const algorithmResultsPromises: Promise<{
			path: ArbitragePath | null
			edgesWithRate: Map<string, EdgeWithRate>
		}>[] = []

		let valueUSD = initialValueUSD
		for (let i = 0; i < stepsAmount; i++) {
			const tokenAmount = startToken.parseUnits(
				(valueUSD / startTokenUSDPrice).toString(),
			)

			valueUSD += stepUSD

			algorithmResultsPromises.push(
				findArbitragePath(
					startToken,
					tokenAmount,
					graph,
					maxPathLength,
				),
			)
		}

		const algorithmResults = await Promise.all(algorithmResultsPromises)

		const maxProfitPath = algorithmResults.reduce((max, current) => {
			if (max.path === null) {
				return max
			}

			if (
				current.path &&
				current.path.profitAmount > max.path.profitAmount
			) {
				return current
			}

			return max
		}, algorithmResults[0])

		return maxProfitPath
	}
}
