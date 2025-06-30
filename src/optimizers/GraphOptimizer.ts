import { BaseError } from 'viem'
import { GraphOpportunityFinder } from '../graphs/GraphOpportunityFinder'
import { Graph } from '../graphs/primitives/Graph'
import { createCustomError } from '../utils/common'
import logger from '../utils/logger'

const GraphOptimizerError = createCustomError('GraphOptimizerError')

export class GraphOptimizer {
	/**
	 * Optimize arbitrage opportunity by changing amount of start token
	 * @param startToken
	 * @param startTokenUSDPrice
	 * @param graph
	 * @param options
	 * @returns - {@link GraphArbitrageOpportunity} or null, if no opportunity found
	 * @throws - {@link GraphOptimizerError} if all optimization attempts failed with errors
	 */
	static async findOpportunity(
		startToken: GraphNode,
		startTokenUSDPrice: number,
		graph: Graph,
		options: GraphOptimizerOptions,
	): Promise<GraphArbitrageOpportunity | null> {
		const { initialValueUSD, stepUSD, stepsAmount, maxPathLength } = options

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

		if (algorithmResults.length === 0) {
			this.handleErrors(algorithmResultsSettled)

			throw new GraphOptimizerError(
				'All optimization attempts failed with errors',
			)
		}

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

	private static handleErrors(
		algorithmResultsSettled: PromiseSettledResult<GraphArbitrageOpportunity | null>[],
	) {
		logger.error('Errors occurred during graph optimization')

		algorithmResultsSettled.forEach((result) => {
			if (
				result.status === 'rejected' &&
				result.reason instanceof BaseError
			) {
				logger.error(result.reason.shortMessage)
			}
		})
	}
}
