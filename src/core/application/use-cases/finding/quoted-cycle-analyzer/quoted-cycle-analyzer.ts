import { Inject, Injectable } from '@nestjs/common'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { OnTypedEvent } from '../../../events/event-decorator'
import { EventEmitter } from '../../../events/typed-event-emmiter2'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../interfaces/price-oracle'

@Injectable()
export class QuotedCycleAnalyzer {
	constructor(
		@Inject(PRICE_ORACLE_TOKEN) private readonly priceOracle: PriceOracle,
		private readonly eventEmitter: EventEmitter,
	) {}

	@OnTypedEvent('cycleQuoted')
	async analyzeQuotedPath(quotedCycle: QuotedPath<Token>) {
		const revenueInUsd = await this.calculateRevenue(
			quotedCycle.startAmount,
			quotedCycle.endAmount,
			quotedCycle.quotedStepSequence[0].edge.from,
		)

		const costInUsd = this.calculateCost(quotedCycle)

		const profitInUsd = revenueInUsd - costInUsd

		const opportunityId = crypto.randomUUID()

		if (revenueInUsd > 0) {
			this.eventEmitter.emit('opportunityFound', {
				...quotedCycle,
				revenueInUsd,
				costInUsd,
				profitInUsd: revenueInUsd - costInUsd,
				id: opportunityId,
			})
		}

		return { revenueInUsd, costInUsd, profitInUsd }
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
