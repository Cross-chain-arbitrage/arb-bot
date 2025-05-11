import { Address } from "viem"

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

export async function getTokenData(
	address: Address,
	network: string = "eth",
): Promise<TokenData> {
	const tokenDataUrl = `${BASE_URL}/networks/${network}/tokens/${address}`
	const response = await fetch(tokenDataUrl)
	const data = (await response.json()) as { data: TokenData }
	return data.data
}

export async function getTokenPrice(address: Address): Promise<number> {
	const tokenData = await getTokenData(address)
	return Number(tokenData.attributes.price_usd)
}
