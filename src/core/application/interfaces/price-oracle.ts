export interface PriceOracle {
	getPrice(token: string): Promise<number>
	getPrices(tokens: string[]): Promise<Record<string, number>>
}
