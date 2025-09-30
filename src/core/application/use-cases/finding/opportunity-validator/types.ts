export interface OpportunityValidatorParams {
	minProfitUsd: number
}

export type ValidationResult =
	| {
			ok: true
	  }
	| {
			ok: false
			reason: 'NO_OPPORTUNITY' | 'LOW_PROFIT'
	  }
