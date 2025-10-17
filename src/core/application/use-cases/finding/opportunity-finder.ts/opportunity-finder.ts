import { Inject, Injectable } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../interfaces/price-oracle'
import { GraphSnapshotBuilder } from '../graph-snapshot-builder/gpaph-snapshot-builder'
import { SnapshotOpportunityFinder } from '../snapshot-opportunity-finder/snapshot-opportunity-finder'
import {
	GraphArbitrageOpportunity,
	SnapshotFindOpportunityParams,
} from '../snapshot-opportunity-finder/types'

@Injectable()
export class OpportunityFinder {
	constructor(
		private readonly snapshotOpportunityFinder: SnapshotOpportunityFinder,
		private readonly graphSnapshotBuilder: GraphSnapshotBuilder,
		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,
	) {}

	async findOpportunity(
		graph: Graph,
		snapshotFindOpportunityParams: SnapshotFindOpportunityParams,
	): Promise<GraphArbitrageOpportunity | null> {
		const graphSnapshot =
			await this.graphSnapshotBuilder.buildSnapshot(graph)

		const graphArbitrageCycle =
			await this.snapshotOpportunityFinder.findOpportunity(
				graphSnapshot,
				snapshotFindOpportunityParams,
			)

		if (!graphArbitrageCycle) return null

		const revenueInUsd = await this.calculateRevenue(
			graphArbitrageCycle.startAmount,
			graphArbitrageCycle.endAmount,
			snapshotFindOpportunityParams.startToken,
		)

		const costInUsd = this.calculateCost(graphArbitrageCycle)

		return {
			...(graphArbitrageCycle as QuotedPath<Token>),
			revenueInUsd,
			costInUsd,
			profitInUsd: revenueInUsd - costInUsd,
			id: crypto.randomUUID(),
		}
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
