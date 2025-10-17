import { Inject, Injectable } from '@nestjs/common'
import { BellmanFord } from '../../../../domain/services/bellman-ford'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { GraphSnapshot } from '../../../../domain/value-objects/weighted-graph-snapshot'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../interfaces/price-oracle'
import { SnapshotFindOpportunityParams } from './types'

@Injectable()
export class SnapshotOpportunityFinder {
	constructor(
		@Inject(PRICE_ORACLE_TOKEN) private readonly priceOracle: PriceOracle,
	) {}

	async findOpportunity(
		graphSnapshot: GraphSnapshot,
		params: SnapshotFindOpportunityParams,
	): Promise<QuotedPath | null> {
		const { minStartValueUsd, maxStartValueUsd, runCount, startToken } =
			params

		const startTokenUSDPrice = await this.priceOracle.getPrice(startToken)

		const algorithmResults: (QuotedPath | null)[] = []

		let valueUSD = minStartValueUsd

		for (let i = 0; i < runCount; i++) {
			const tokenAmount = startToken.parseUnits(
				(valueUSD / startTokenUSDPrice).toString(),
			)

			algorithmResults.push(
				BellmanFord.findNegativeSumCycle(
					startToken,
					tokenAmount,
					graphSnapshot,
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

		if (!maxProfitPath) {
			return null
		}

		return {
			...maxProfitPath,
		}
	}
}
