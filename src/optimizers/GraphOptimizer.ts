import {
	GraphArbitrageOpportunity,
	findArbOpportunity,
} from '../graphs/GraphOpportunityFinder'
import { EdgeWithRate, Graph, GraphNode } from '../graphs/primitives/Graph'

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
		path: GraphArbitrageOpportunity | null
		edgesWithRate: Map<string, EdgeWithRate>
	}> {
		const { initialValueUSD, stepUSD, stepsAmount, maxPathLength } = {
			...DEFAULT_OPTIONS,
			...options,
		}

		const algorithmResultsPromises: Promise<{
			path: GraphArbitrageOpportunity | null
			edgesWithRate: Map<string, EdgeWithRate>
		}>[] = []

		let valueUSD = initialValueUSD
		for (let i = 0; i < stepsAmount; i++) {
			const tokenAmount = startToken.parseUnits(
				(valueUSD / startTokenUSDPrice).toString(),
			)

			valueUSD += stepUSD

			algorithmResultsPromises.push(
				findArbOpportunity(
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
