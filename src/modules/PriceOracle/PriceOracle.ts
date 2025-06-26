import { isAddressEqual } from 'viem'
import { GeckoTerminalAPI } from '../../dataApi/geckoterminal/GeckoTerminalAPI'
import { chainIdToGeckoChainId } from '../../dataApi/geckoterminal/chains'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { createCustomError } from '../../utils/common'

export type CurrencyId = TokenId
export type Currency = Token | NativeCurrency

const PriceOracleError = createCustomError('PriceOracleError')

export class PriceOracle {
	protected static prices: Map<CurrencyId, number> = new Map()
	protected static currenciesToUpdate: Map<CurrencyId, Currency> = new Map()
	protected static priceUpdater: NodeJS.Timeout | undefined

	/**
	 * Initialize prices for a list of currencies and start updating prices every 5 minutes
	 * @param updateInterval - The interval to update prices, false to not update prices, undefined to use the default interval
	 */
	static async initializePrices(
		currencies: Currency[],
		updateInterval: number | false | undefined = 1000 * 60 * 5,
	) {
		currencies.forEach((currency) =>
			this.currenciesToUpdate.set(currency.id, currency),
		)

		const currenciesAndPrices = await this.getPrices(
			currencies,
			updateInterval,
		)

		if (updateInterval) {
			this.startPriceUpdating(updateInterval)
		}

		return currenciesAndPrices
	}

	/**
	 * Start updating prices every updateInterval, if there is no price updater running, it will be started
	 */
	static startPriceUpdating(updateInterval: number = 1000 * 60 * 5): void {
		if (this.priceUpdater) {
			return
		}

		this.priceUpdater = setInterval(() => {
			this.updatePrices().catch((error) =>
				console.error('Error updating prices:', error),
			)
		}, updateInterval)
	}

	static stopPriceUpdating(): void {
		if (this.priceUpdater) {
			clearInterval(this.priceUpdater)
			this.priceUpdater = undefined
		}
	}

	/**
	 * Get the price of a currency, cache it and update it every 5 minutes
	 * @param updateInterval - The interval to update prices, false to not update prices, undefined to use the default interval
	 */
	static async getPrice(
		currency: Currency,
		useCache: boolean = true,
		updateInterval: number | false | undefined = 1000 * 60 * 5,
	): Promise<number> {
		const isCurrencyNative = currency.isNative()

		if (isCurrencyNative) {
			const wrappedNative = await TokenUtils.getWrappedNative(
				currency.chainId,
			)
			currency = wrappedNative
		}

		if (useCache) {
			const price = this.prices.get(currency.id)

			if (price) {
				return price
			}
		}

		const geckoId = this.getGeckoId(currency.chainId)

		const tokenPrice = await GeckoTerminalAPI.getTokenPrice(
			currency.address,
			geckoId,
		)

		this.currenciesToUpdate.set(currency.id, currency)
		this.prices.set(currency.id, tokenPrice)

		if (updateInterval) {
			this.startPriceUpdating(updateInterval)
		}

		return tokenPrice
	}

	/**
	 * Get the price of a currency, cache it and update it every 5 minutes
	 * @param updateInterval - The interval to update prices, false to not update prices, undefined to use the default interval
	 */
	static async getPrices(
		currencies: Currency[],
		updateInterval: number | false | undefined = 1000 * 60 * 5,
		useCache: boolean = true,
	): Promise<{ currency: Currency; price: number }[]> {
		const unknownCurrenciesByChain = new Map<number, Currency[]>()

		const unknownCurrencies: Currency[] = []
		const prices: { currency: Currency; price: number }[] = []

		if (useCache) {
			for (const currency of currencies) {
				const isCurrencyNative = currency.isNative()

				if (isCurrencyNative) {
					const wrappedNative = await TokenUtils.getWrappedNative(
						currency.chainId,
					)

					const currencyPrice = this.prices.get(wrappedNative.id)

					if (currencyPrice) {
						prices.push({ currency, price: currencyPrice })
					} else {
						unknownCurrencies.push(currency)
					}
				} else {
					const currencyPrice = this.prices.get(currency.id)

					if (currencyPrice) {
						prices.push({ currency, price: currencyPrice })
						continue
					}

					unknownCurrencies.push(currency)
				}
			}
		} else {
			unknownCurrencies.push(...currencies)
		}

		for (const currency of unknownCurrencies) {
			if (!unknownCurrenciesByChain.has(currency.chainId)) {
				unknownCurrenciesByChain.set(currency.chainId, [])
			}

			unknownCurrenciesByChain.get(currency.chainId)!.push(currency)
		}

		for (const [
			chainId,
			chainCurrencies,
		] of unknownCurrenciesByChain.entries()) {
			const currenciesAndPricesOnChain =
				await this.getUnknownPricesOnChain(chainId, chainCurrencies)

			prices.push(...currenciesAndPricesOnChain)
		}

		if (updateInterval) {
			this.startPriceUpdating(updateInterval)
		}

		return prices
	}

	/**
	 * fetch prices, add it in cache and in currenciesToUpdate
	 */
	private static async getUnknownPricesOnChain(
		chainId: number,
		currencies: Currency[],
	) {
		const prices: { currency: Currency; price: number }[] = []

		const geckoId = this.getGeckoId(chainId)
		const addresses: Address[] = []

		for (const currency of currencies) {
			const isCurrencyNative = currency.isNative()

			if (isCurrencyNative) {
				const wrappedNative = await TokenUtils.getWrappedNative(
					currency.chainId,
				)

				addresses.push(wrappedNative.address)
			} else {
				addresses.push(currency.address)
			}
		}

		const addressesAndPrices = await GeckoTerminalAPI.getTokensPrices(
			addresses,
			geckoId,
		)

		for (const currency of currencies) {
			const isCurrencyNative = currency.isNative()

			if (isCurrencyNative) {
				const wrappedNative = await TokenUtils.getWrappedNative(
					currency.chainId,
				)

				const addressAndPrice = addressesAndPrices.find(
					(addressAndPrice) =>
						isAddressEqual(
							addressAndPrice.address,
							wrappedNative.address,
						),
				)

				if (!addressAndPrice) {
					// should never throw, because we are sure that the address is in the list
					throw new PriceOracleError(
						`Price not found for address: ${wrappedNative.address}`,
					)
				}

				prices.push({ currency, price: addressAndPrice.price })
			} else {
				const addressAndPrice = addressesAndPrices.find(
					(addressAndPrice) =>
						isAddressEqual(
							addressAndPrice.address,
							currency.address,
						),
				)

				if (!addressAndPrice) {
					// should never throw, because we are sure that the address is in the list
					throw new PriceOracleError(
						`Price not found for address: ${currency.address}`,
					)
				}

				prices.push({ currency, price: addressAndPrice.price })

				this.prices.set(currency.id, addressAndPrice.price)
				this.currenciesToUpdate.set(currency.id, currency)
			}
		}

		return prices
	}

	private static async updatePrices(): Promise<void> {
		const currenciesToUpdate = Array.from(this.currenciesToUpdate.values())

		if (currenciesToUpdate.length > 0) {
			await this.getPrices(currenciesToUpdate)
		}
	}

	private static getGeckoId(chainId: number): string {
		const chainIdStr = String(chainId) as keyof typeof chainIdToGeckoChainId

		const geckoId = chainIdToGeckoChainId[chainIdStr]

		if (!geckoId) {
			throw new Error(`Unsupported chainId for PriceOracle: ${chainId}`)
		}

		return geckoId
	}
}
