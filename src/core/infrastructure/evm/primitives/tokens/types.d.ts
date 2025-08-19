type TokenId = `${ChainId}:${Address}`

interface TokenMetadata {
	symbol: string
	name?: string
	decimals: number
}
