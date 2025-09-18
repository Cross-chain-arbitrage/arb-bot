// TODO: runInterval configuration is not area of responsibility of the arbitrage finder
export type ArbitrageFinderConfig = {
	runInterval: number

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
