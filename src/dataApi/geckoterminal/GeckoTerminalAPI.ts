import axios from 'axios'
import { Address } from 'viem'
import { CHAINS } from './chains'

interface GeckoTerminalTokenData {
	id: string
	type: string
	attributes: {
		address: Address
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

// docs say that you can retrieve up to 30 addresses in one request
const BATCH_SIZE = 30

export class GeckoTerminalAPI {
	private readonly baseUrl: string = 'https://api.geckoterminal.com/api/v2'

	async getTokenData(
		address: Address,
		network: string,
	): Promise<GeckoTerminalTokenData> {
		this.validateChain(network)

		const tokenDataUrl = `${this.baseUrl}/networks/${network}/tokens/${address}`
		const { data } = await axios.get<{ data: GeckoTerminalTokenData }>(
			tokenDataUrl,
		)

		return data.data
	}

	async getTokenPrice(address: Address, network: string): Promise<number> {
		this.validateChain(network)

		const tokenData = await this.getTokenData(address, network)
		return Number(tokenData.attributes.price_usd)
	}

	async getTokenPrices(
		addresses: Address[],
		network: string,
	): Promise<{ address: Address; price: number }[]> {
		this.validateChain(network)

		const allTokens: GeckoTerminalTokenData[] = []

		// Process addresses in batches of 30
		for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
			const batch = addresses.slice(i, i + BATCH_SIZE)
			const addressesString = batch.join(',')

			const tokensDataUrl = `${this.baseUrl}/networks/${network}/tokens/multi/${addressesString}`

			const { data } = await axios.get<{
				data: GeckoTerminalTokenData[]
			}>(tokensDataUrl)

			allTokens.push(...data.data)
		}

		return allTokens.map((token) => ({
			address: token.attributes.address,
			price: Number(token.attributes.price_usd),
		}))
	}

	async getTokenPriceETH(): Promise<number> {
		return this.getTokenPrice(
			'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
			'eth',
		)
	}

	async getTokenPriceBTC(): Promise<number> {
		return this.getTokenPrice(
			'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
			'eth',
		)
	}

	validateChain(chain: string) {
		const some = CHAINS.some((c) => c.id === chain)
		if (!some) throw new Error(`Chain ${chain} not found`)
	}
}
