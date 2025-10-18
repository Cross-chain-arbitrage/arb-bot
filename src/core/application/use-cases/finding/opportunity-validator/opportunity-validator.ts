import { Injectable } from '@nestjs/common'
import { ArbitrageOpportunity } from '../snapshot-opportunity-finder/types'
import { OpportunityValidatorParams, ValidationResult } from './types'

@Injectable()
export class OpportunityValidator {
	constructor() {}

	validateOpportunities(
		opportunities: ArbitrageOpportunity[] | null,
		params: OpportunityValidatorParams,
	): ValidationResult {
		if (!opportunities) {
			return {
				ok: false,
				reason: 'NO_OPPORTUNITY',
			}
		}

		const maxProfitOpportunity = opportunities.reduce((max, current) => {
			if (current.profitInUsd > max.profitInUsd) {
				return current
			}

			return max
		}, opportunities[0])

		if (maxProfitOpportunity.profitInUsd < params.minProfitUsd) {
			return {
				ok: false,
				reason: 'LOW_PROFIT',
			}
		}

		return {
			ok: true,
			opportunity: maxProfitOpportunity,
		}
	}
}
