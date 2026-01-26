import { TokenId } from '../value-objects/token-id'

export interface TokenMetadata {
	symbol: string
	name?: string
	decimals: number
}

export type Token<SpecificToken = object> = {
	id: TokenId

	address: string

	formatUnits(amount: bigint): string
	parseUnits(amount: string | bigint): bigint
	toString(): string
} & TokenMetadata &
	SpecificToken
