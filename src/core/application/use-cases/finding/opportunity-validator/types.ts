import { ArbitrageOpportunity } from '../../../../domain/value-objects/opportunity'

export interface OpportunityValidatorParams {
	minProfitUsd: number
}

export type ValidationResult =
	| {
			ok: true
			opportunity: ArbitrageOpportunity
	  }
	| {
			ok: false
			reason: 'NO_OPPORTUNITY' | 'LOW_PROFIT'
	  }
