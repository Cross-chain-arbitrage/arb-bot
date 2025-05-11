import { Address } from "viem"

interface TokenData {
	id: string
	type: string
	attributes: {
		address: string
		name: string
		symbol: string
		decimals: number
		image_url: string
		coingecko_coin_id: string
		total_supply: string
		price_usd: string
		fdv_usd: string
		total_reserve_in_usd: string
		volume_usd: {
			h24: string
		}
		market_cap_usd: string
	}
}

export class GeckoTerminalAPI {
	private static readonly baseUrl: string =
		"https://api.geckoterminal.com/api/v2"

	static async getTokenData(
		address: Address,
		network: string = "eth",
	): Promise<TokenData> {
		const tokenDataUrl = `${GeckoTerminalAPI.baseUrl}/networks/${network}/tokens/${address}`
		const response = await fetch(tokenDataUrl)
		const data = (await response.json()) as { data: TokenData }
		return data.data
	}

	static async getTokenPrice(address: Address): Promise<number> {
		const tokenData = await this.getTokenData(address)
		return Number(tokenData.attributes.price_usd)
	}
}
