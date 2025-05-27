import axios, { AxiosError } from 'axios'
import logger from '../../utils/logger'

export class CoinMarketCapAPI {
	private static readonly API_KEY = process.env.COINMARKETCAP_API_KEY
	private static readonly BASE_URL = 'https://pro-api.coinmarketcap.com/v2'
	private static readonly SANDBOX_URL =
		'https://sandbox-api.coinmarketcap.com/v2'
	private static readonly SANDBOX_API_KEY =
		'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c'

	private static instance: CoinMarketCapAPI
	private readonly baseUrl: string
	private readonly apiKey: string

	private constructor() {
		// Use sandbox in development, production in production
		this.baseUrl =
			process.env.NODE_ENV === 'production'
				? CoinMarketCapAPI.BASE_URL
				: CoinMarketCapAPI.SANDBOX_URL

		this.apiKey =
			process.env.NODE_ENV === 'production'
				? CoinMarketCapAPI.API_KEY || ''
				: CoinMarketCapAPI.SANDBOX_API_KEY
	}

	public static getInstance(): CoinMarketCapAPI {
		if (!CoinMarketCapAPI.instance) {
			CoinMarketCapAPI.instance = new CoinMarketCapAPI()
		}
		return CoinMarketCapAPI.instance
	}

	private async makeRequest<T>(
		endpoint: string,
		params: Record<string, string>,
	): Promise<T> {
		try {
			const response = await axios.get<T>(`${this.baseUrl}${endpoint}`, {
				headers: {
					'X-CMC_PRO_API_KEY': this.apiKey,
					Accept: 'application/json',
				},
				params,
			})
			return response.data
		} catch (error) {
			logger.error(
				`CoinMarketCap API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
			throw error
		}
	}

	public async getTokenPrice(symbol: string): Promise<number> {
		try {
			const response = await this.makeRequest<{
				data: {
					[key: string]: {
						quote: {
							USD: {
								price: number
							}
						}
					}
				}
			}>('/cryptocurrency/quotes/latest', {
				symbol,
				convert: 'USD',
			})

			const tokenData = Object.values(response.data)[0]
			if (!tokenData) {
				throw new Error(`No price data found for ${symbol}`)
			}

			return tokenData.quote.USD.price
		} catch (error) {
			logger.error(
				`Failed to get price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
			throw error
		}
	}

	public async getTokenPrices(
		symbols: string[],
	): Promise<Record<string, number>> {
		try {
			const response = await this.makeRequest<{
				data: {
					[key: string]: {
						quote: {
							USD: {
								price: number
							}
						}
					}
				}
			}>('/cryptocurrency/quotes/latest', {
				symbol: symbols.join(','),
				convert: 'USD',
			})

			const prices: Record<string, number> = {}
			for (const [symbol, data] of Object.entries(response.data)) {
				prices[symbol] = data.quote.USD.price
			}

			return prices
		} catch (error) {
			if (error instanceof AxiosError) {
				logger.error(
					`Failed to get prices for ${symbols.join(', ')}: ${error.response?.data}`,
				)
			} else {
				logger.error(
					`Failed to get prices for ${symbols.join(', ')}: ${error instanceof Error ? error.message : 'Unknown error'}`,
				)
			}
			throw error
		}
	}
}
