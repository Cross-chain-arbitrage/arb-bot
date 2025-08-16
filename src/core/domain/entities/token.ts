export interface Token {
	id: string

	address: string
	name?: string
	symbol: string
	decimals: number

	formatUnits(amount: bigint): string
	parseUnits(amount: string | bigint): bigint
}
