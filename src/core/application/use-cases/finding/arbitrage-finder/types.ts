export type ArbitrageFinderConfig = {
	finding: {
		minStartValueUsd: number
		maxStartValueUsd: number
		runCount: number
		startTokenId: string
	}
	validation: {
		minProfitUsd: number
		minDuration: number
	}
}
