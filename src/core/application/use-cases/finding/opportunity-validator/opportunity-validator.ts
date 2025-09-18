import { Injectable } from '@nestjs/common'
import { GraphArbitrageOpportunity } from '../snapshot-opportunity-finder/types'
import { OpportunityValidatorParams, ValidationResult } from './types'

@Injectable()
export class OpportunityValidator {
	constructor() {}

	validateOpportunity(
		opportunity: GraphArbitrageOpportunity | null,
		params: OpportunityValidatorParams,
	): ValidationResult {
		if (!opportunity || !opportunity.path) {
			return {
				ok: false,
				reason: { type: 'NO_OPPORTUNITY', msg: 'No arbitrage found' },
			}
		}

		const expectedProfit = opportunity.revenueInUsd - opportunity.costInUsd

		if (expectedProfit < params.minProfitUsd) {
			return {
				ok: false,
				reason: {
					type: 'LOW_PROFIT',
					expectedProfit,
				},
			}
		}

		return {
			ok: true,
			expectedProfit,
		}
	}
}
