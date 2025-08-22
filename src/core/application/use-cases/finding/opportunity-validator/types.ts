export interface OpportunityValidatorParams {
	minProfitUsd: number
}

export type ValidationResult =
	| {
			ok: true
			expectedRevenue: number
			expectedProfit: number
			executionCostUsd: number
	  }
	| {
			ok: false
			reason:
				| { type: 'NO_OPPORTUNITY'; msg: string }
				| {
						type: 'LOW_PROFIT'
						expectedRevenue: number
						expectedProfit: number
						executionCostUsd: number
				  }
	  }
