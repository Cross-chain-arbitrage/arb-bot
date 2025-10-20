import { Inject, Injectable } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import {
	ParamsFindCycle,
	PATH_FINDER_TOKEN,
	PathFinder,
} from '../../../interfaces/path-finder'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../interfaces/price-oracle'
import { GraphSnapshotBuilder } from '../graph-snapshot-builder/gpaph-snapshot-builder'
import { SnapshotOpportunityFinder } from '../snapshot-opportunity-finder/snapshot-opportunity-finder'
import {
	ArbitrageOpportunity,
	SnapshotFindOpportunityParams,
} from '../snapshot-opportunity-finder/types'

@Injectable()
export class OpportunityFinder {
	constructor(
		private readonly snapshotOpportunityFinder: SnapshotOpportunityFinder,
		private readonly graphSnapshotBuilder: GraphSnapshotBuilder,

		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,

		@Inject(PATH_FINDER_TOKEN)
		private readonly pathFinder: PathFinder,
	) {}

	async findOpportunity(
		graph: Graph,
		snapshotFindOpportunityParams: SnapshotFindOpportunityParams,
	): Promise<ArbitrageOpportunity[] | null> {
		const { minStartValueUsd, maxStartValueUsd, runCount, startToken } =
			snapshotFindOpportunityParams

		const startTokenUSDPrice = await this.priceOracle.getPrice(startToken)

		let valueUSD = minStartValueUsd
		const paramsFindCycles: ParamsFindCycle[] = []

		for (let i = 0; i < runCount; i++) {
			const startAmount = startToken.parseUnits(
				(valueUSD / startTokenUSDPrice).toString(),
			)

			paramsFindCycles.push({
				startToken,
				startAmount,
			})

			if (runCount === 1) continue

			valueUSD += (maxStartValueUsd - minStartValueUsd) / (runCount - 1)
		}

		const negativeSumCycles = await this.pathFinder.findNegativeSumCycles(
			graph,
			paramsFindCycles,
		)

		if (!negativeSumCycles) return null

		const opportunityId = crypto.randomUUID()

		const opportunities = await Promise.all(
			negativeSumCycles.map(async (cycle) => {
				const revenueInUsd = await this.calculateRevenue(
					cycle.startAmount,
					cycle.endAmount,
					snapshotFindOpportunityParams.startToken,
				)

				const costInUsd = this.calculateCost(cycle)

				const opportunity: ArbitrageOpportunity = {
					...(cycle as QuotedPath<Token>),
					revenueInUsd,
					costInUsd,
					profitInUsd: revenueInUsd - costInUsd,
					id: opportunityId,
				}

				return opportunity
			}),
		)

		return opportunities
	}

	private async calculateRevenue(
		amountStart: bigint,
		amountEnd: bigint,
		startToken: Token,
	) {
		const amountEndFormatted = Number(startToken.formatUnits(amountEnd))

		const amountStartFormatted = Number(startToken.formatUnits(amountStart))

		const startTokenPrice = await this.priceOracle.getPrice(startToken)

		return (amountEndFormatted - amountStartFormatted) * startTokenPrice
	}

	private calculateCost(graphArbitrageCycle: QuotedPath) {
		return graphArbitrageCycle.quotedStepSequence.reduce((acc, step) => {
			return acc + step.quote.expectedCostInUsd
		}, 0)
	}
}
