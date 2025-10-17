export interface Quote {
	negativeLogRate: number // negative log of exchange rate
	amountOut: bigint
	expectedCostInUsd: number
}
