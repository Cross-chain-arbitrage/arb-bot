const BASE_URL = "https://api.geckoterminal.com/api/v2"

const TOKEN_DATA = "/networks/eth/tokens/"

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

export async function getTokenData(address: string): Promise<TokenData> {
	const response = await fetch(`${BASE_URL}${TOKEN_DATA}${address}`)
	const data = await response.json()
	return data.data
}
