type TokenId = `${ChainId}:${Address}`

interface TokenMetadata {
	symbol: string
	name?: string
	decimals: number
}
interface BaseToken {
	id: string
	symbol: string
	decimals: number
	name?: string
	toString(): string
	toStringFull(): string
	formatUnits(amount: bigint): string
	parseUnits(amount: string | bigint): bigint
	balanceOf(address: string): Promise<bigint>
}
