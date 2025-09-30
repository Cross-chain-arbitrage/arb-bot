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
				reason: 'NO_OPPORTUNITY',
			}
		}

		if (opportunity.profitInUsd < params.minProfitUsd) {
			return {
				ok: false,
				reason: 'LOW_PROFIT',
			}
		}

		return {
			ok: true,
		}
	}
}
