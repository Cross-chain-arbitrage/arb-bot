import { Injectable } from '@nestjs/common'
import { Token } from '../../../../domain/entities/token'
import { PriceOracle } from '../../../interfaces/price-oracle'
import { GraphArbitrageOpportunity } from '../snapshot-opportunity-finder/types'
import { OpportunityValidatorParams, ValidationResult } from './types'

@Injectable()
export class OpportunityValidator {
	constructor(private readonly priceOracle: PriceOracle) {}

	async validateOpportunity(
		opportunity: GraphArbitrageOpportunity | null,
		params: OpportunityValidatorParams,
	): Promise<ValidationResult> {
		if (!opportunity || !opportunity.path) {
			return {
				ok: false,
				reason: { type: 'NO_OPPORTUNITY', msg: 'No arbitrage found' },
			}
		}

		const expectedRevenue = await this.calculateRevenue(
			opportunity.startAmount,
			opportunity.endAmount,
			opportunity.startToken,
		)

		let totalExecutionCostInUsd = 0

		for (const step of opportunity.path) {
			totalExecutionCostInUsd += step.quote.executionCostInUsd
		}

		const expectedProfit = expectedRevenue - totalExecutionCostInUsd

		if (expectedProfit < params.minProfitUsd) {
			return {
				ok: false,
				reason: {
					type: 'LOW_PROFIT',
					expectedRevenue,
					expectedProfit,
					executionCostUsd: totalExecutionCostInUsd,
					minProfitUsd: params.minProfitUsd,
				},
			}
		}

		return {
			ok: true,
			expectedRevenue,
			expectedProfit,
			executionCostUsd: totalExecutionCostInUsd,
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
}
