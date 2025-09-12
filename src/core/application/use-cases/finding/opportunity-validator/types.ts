export interface OpportunityValidatorParams {
	minProfitUsd: number
}

export type ValidationResult =
	| {
			ok: true
			expectedProfit: number
	  }
	| {
			ok: false
			reason:
				| { type: 'NO_OPPORTUNITY'; msg: string }
				| {
						type: 'LOW_PROFIT'
						expectedProfit: number
				  }
	  }
