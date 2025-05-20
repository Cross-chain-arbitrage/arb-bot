import { Address } from 'viem'

interface TokenHolder {
	address: Address
	balance: bigint
	isContract: boolean
}

interface TokenBalance {
	address: Address
	symbol: string
	decimals: number
	balance: bigint
}

interface BlockscoutHolderResponse {
	items: Array<{
		address: string
		value: string
		is_contract: boolean
	}>
}

interface BlockscoutBalanceResponse {
	items: Array<{
		token: {
			address: string
			symbol: string
			decimals: number
		}
		value: string
	}>
}

export class BlockscoutAPI {
	constructor(private readonly baseUrl: string) {}

	async getTokenHolders(tokenAddress: Address): Promise<TokenHolder[]> {
		const response = await fetch(
			`${this.baseUrl}/api/v2/tokens/${tokenAddress}/holders`,
		)
		if (!response.ok) {
			throw new Error(
				`Failed to fetch token holders: ${response.statusText}`,
			)
		}

		const data = (await response.json()) as BlockscoutHolderResponse
		return data.items.map((holder) => ({
			address: holder.address as Address,
			balance: BigInt(holder.value),
			isContract: holder.is_contract,
		}))
	}

	async getTokenBalances(address: Address): Promise<TokenBalance[]> {
		const response = await fetch(
			`${this.baseUrl}/api/v2/addresses/${address}/token-balances`,
		)
		if (!response.ok) {
			throw new Error(
				`Failed to fetch token balances: ${response.statusText}`,
			)
		}

		const data = (await response.json()) as BlockscoutBalanceResponse
		return data.items.map((token) => ({
			address: token.token.address as Address,
			symbol: token.token.symbol,
			decimals: token.token.decimals,
			balance: BigInt(token.value),
		}))
	}
}
