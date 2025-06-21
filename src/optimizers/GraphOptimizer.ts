import { GraphOpportunityFinder } from '../graphs/GraphOpportunityFinder'
import { Graph } from '../graphs/primitives/Graph'

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
	): Promise<GraphArbitrageOpportunity | null> {
		const { initialValueUSD, stepUSD, stepsAmount, maxPathLength } = {
			...DEFAULT_OPTIONS,
			...options,
		}

		const algorithmResultsPromises: Promise<GraphArbitrageOpportunity | null>[] =
			[]

		let valueUSD = initialValueUSD
		for (let i = 0; i < stepsAmount; i++) {
			const tokenAmount = startToken.parseUnits(
				(valueUSD / startTokenUSDPrice).toString(),
			)

			valueUSD += stepUSD

			algorithmResultsPromises.push(
				GraphOpportunityFinder.findArbOpportunity(
					startToken,
					tokenAmount,
					graph,
					maxPathLength,
				),
			)
		}

		const algorithmResultsSettled = await Promise.allSettled(
			algorithmResultsPromises,
		)

		// TODO: add logging for failed paths
		const algorithmResults = algorithmResultsSettled
			.filter((result) => result.status === 'fulfilled')
			.map((result) => result.value)

		const maxProfitPath = algorithmResults.reduce((max, current) => {
			if (max === null) {
				return max
			}

			if (current && current.profitAmount > max.profitAmount) {
				return current
			}

			return max
		}, algorithmResults[0])

		return maxProfitPath
	}
}
