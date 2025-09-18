export type ArbitrageFinderConfig = {
	opportunityFinding: {
		minStartValueUsd: number
		maxStartValueUsd: number
		runCount: number
		startTokenId: string
	}
	opportunityValidation: {
		minProfitUsd: number
	}
}
