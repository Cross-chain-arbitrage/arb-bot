import axios, { AxiosInstance } from 'axios'
import dotenv from 'dotenv'
import { getEnvSafe } from '../../utils/common'
import logger from '../../utils/logger'

dotenv.config()

const CURRENCY_TO_UCID = {
	ETH: '1027',
	BTC: '1',
	FUSE: '5634',
	USDT: '825',
}

export class PriceOracle<
	T extends Record<string, string> = typeof CURRENCY_TO_UCID,
> {
	readonly axiosClient: AxiosInstance
	readonly currencyToUCID: T
	readonly updateInterval: number
	updateIntervalId: NodeJS.Timeout | undefined

	private _UCIDToCurrency: Record<string, string>
	private _prices: Record<keyof T, number>

	constructor(updateInterval: number, currencyToUCID: T) {
		this.updateInterval = updateInterval
		this._UCIDToCurrency = Object.fromEntries(
			Object.entries(currencyToUCID).map(([currency, ucid]) => [
				ucid,
				currency,
			]),
		)
		this.currencyToUCID = currencyToUCID
		this.axiosClient = axios.create({
			baseURL: 'https://pro-api.coinmarketcap.com/v1',
			headers: {
				'X-CMC_PRO_API_KEY': getEnvSafe('CMC_API_KEY'),
			},
		})
		this._prices = {} as Record<keyof T, number>
	}

	static async create<
		T extends Record<string, string> = typeof CURRENCY_TO_UCID,
	>(
		updateInterval: number = 10 * 60 * 1000,
		currencyToUCID?: T,
	): Promise<PriceOracle<T>> {
		const priceOracle = new PriceOracle(
			updateInterval,
			currencyToUCID || (CURRENCY_TO_UCID as unknown as T),
		)

		await priceOracle.updatePrices()

		priceOracle.updateIntervalId = setInterval(() => {
			priceOracle.updatePrices().catch((error) => {
				logger.error(error)
			})
		}, priceOracle.updateInterval)

		return priceOracle
	}

	private async updatePrices() {
		const prices = await this.retrievePrices()

		for (const currency in prices.data) {
			const currencyName = this._UCIDToCurrency[currency] as keyof T

			this._prices[currencyName] = prices.data[currency].quote.USD.price
		}
	}

	private async retrievePrices() {
		const ids = Object.values(this.currencyToUCID)

		const response = await this.axiosClient.get<CMCQuotesResponse>(
			'/cryptocurrency/quotes/latest',
			{
				params: {
					id: ids.join(','),
				},
			},
		)

		return response.data
	}

	getPrice(currency: keyof T) {
		const price = this._prices[currency]

		if (!price) {
			throw new Error(`Price for ${currency.toString()} not found`)
		}

		return price as number
	}
}
