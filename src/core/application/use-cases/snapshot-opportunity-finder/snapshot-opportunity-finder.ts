import { Injectable } from '@nestjs/common'
import {
	BellmanFord,
	GraphArbitrageOpportunity,
} from '../../../domain/services/bellman-ford'
import { WeightedGraphSnapshot } from '../../../domain/value-objects/weighted-graph-snapshot'
import { PriceOracle } from '../../interfaces/price-oracle'
import { FindOpportunityOptions } from './types'

@Injectable()
export class SnapshotOpportunityFinder {
	constructor(private readonly priceOracle: PriceOracle) {}

	async findOpportunity(
		weightedGraphSnapshot: WeightedGraphSnapshot,
		options: FindOpportunityOptions,
	) {
		const { minStartValueUsd, maxStartValueUsd, runCount, startToken } =
			options

		const startTokenUSDPrice = await this.priceOracle.getPrice(
			startToken.address,
		)

		const algorithmResults: (GraphArbitrageOpportunity | null)[] = []

		let valueUSD = minStartValueUsd

		for (let i = 0; i < runCount; i++) {
			const tokenAmount = startToken.parseUnits(
				(valueUSD / startTokenUSDPrice).toString(),
			)

			algorithmResults.push(
				BellmanFord.findNegativeSumCycle(
					startToken,
					tokenAmount,
					weightedGraphSnapshot,
				),
			)

			if (runCount === 1) continue

			valueUSD += (maxStartValueUsd - minStartValueUsd) / (runCount - 1)
		}

		const maxProfitPath = algorithmResults.reduce((max, current) => {
			if (max === null) {
				return max
			}

			if (current) {
				const currentProfitAmount =
					current.endAmount - current.startAmount

				const maxProfitAmount = max.endAmount - max.startAmount

				if (currentProfitAmount > maxProfitAmount) {
					return current
				}

				return max
			}

			return max
		}, algorithmResults[0])

		return maxProfitPath
	}
}
