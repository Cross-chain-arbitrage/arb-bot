import { Inject, Injectable, Logger } from '@nestjs/common'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { OnTypedEvent } from '../../../events/event-decorator'
import { EventEmitter } from '../../../events/typed-event-emmiter2'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../interfaces/price-oracle'
import { PathQuoter } from '../../path-quoter/path-quoter'

@Injectable()
export class QuotedCycleAnalyzer {
	logger = new Logger(QuotedCycleAnalyzer.name)

	constructor(
		@Inject(PRICE_ORACLE_TOKEN) private readonly priceOracle: PriceOracle,
		private readonly eventEmitter: EventEmitter,
		private readonly pathQuoter: PathQuoter,
	) {}

	@OnTypedEvent('cycleQuoted')
	async analyzeQuotedPath(quotedCycle: QuotedPath<Token>) {
		try {
			const { revenueInUsd, costInUsd, profitInUsd } =
				await this.calculateFinancialMetrics(quotedCycle)

			if (profitInUsd > 0) {
				const simulatedQuotedCycle =
					await this.requoteWithSimulation(quotedCycle)

				const { revenueInUsd, costInUsd, profitInUsd } =
					await this.calculateFinancialMetrics(simulatedQuotedCycle)

				if (profitInUsd > 0) {
					const opportunityId = crypto.randomUUID()

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

			return { revenueInUsd, costInUsd, profitInUsd }
		} catch (error) {
			this.logger.error(error)
		}
	}

	private async requoteWithSimulation(quotedCycle: QuotedPath<Token>) {
		const quotedPath = (await this.pathQuoter.quotePath(
			quotedCycle.quotedStepSequence.map((step) => step.edge),
			quotedCycle.startAmount,
			true,
		)) as QuotedPath<Token>

		return quotedPath
	}

	private async calculateFinancialMetrics(quotedCycle: QuotedPath<Token>) {
		const revenueInUsd = await this.calculateRevenue(
			quotedCycle.startAmount,
			quotedCycle.endAmount,
			quotedCycle.quotedStepSequence[0].edge.from,
		)

		const costInUsd = this.calculateCost(quotedCycle)

		const profitInUsd = revenueInUsd - costInUsd

		return { profitInUsd, revenueInUsd, costInUsd }
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
