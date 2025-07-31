import { Injectable, Logger } from '@nestjs/common'
import { isAddressEqual } from 'viem'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ChainClientService } from '../../utils/ChainClientService'
import { createCustomError } from '../../utils/common'
import { chainIdToGeckoChainId } from './gecko-terminal-chains.constants.ts'
import { GeckoTerminalService } from './gecko-terminal.service'
import {
	Currency,
	CurrencyId,
	CurrencyState,
	PriceOracleSettings,
} from './price-oracle.types'
const PriceOracleError = createCustomError('PriceOracleError')

const DEFAULT_SETTINGS: PriceOracleSettings = {
	useCachedValues: true,
	updateInterval: 1000 * 60 * 5, // 5 minutes
}

@Injectable()
export class PriceOracleService {
	private currencyStates: Map<CurrencyId, CurrencyState> = new Map()
	private priceUpdater: NodeJS.Timeout | undefined

	constructor(
		readonly chainClientService: ChainClientService,
		readonly tokenUtils: TokenUtils,
		readonly geckoTerminalService: GeckoTerminalService,
		readonly logger: Logger,
	) {}

	/* ======== PUBLIC METHODS ======== */

	/**
	 * Initialize prices for a list of currencies and start updating prices every updateInterval
	 * @param currencies - Array of Token, NativeCurrency or WrappedNative
	 * @param updateInterval - The interval to update prices, false to not update prices, undefined to use the default interval (5 minutes)
	 */
	async initializePriceUpdating(
		currencies: Currency[],
		updateInterval = DEFAULT_SETTINGS.updateInterval,
	) {
		const currencyStates = await this.getPrices(currencies, {
			useCachedValues: false,
			updateInterval,
		})

		if (updateInterval) this.startPriceUpdating(updateInterval)

		return currencyStates
	}

	/**
	 * Start updating prices every updateInterval, if there is no price updater running, it will be started
	 */
	startPriceUpdating(updateInterval: number): void {
		if (this.priceUpdater) {
			return
		}

		this.priceUpdater = setInterval(() => {
			this.updatePrices().catch((error) =>
				this.logger.error('Error updating prices:', error),
			)
		}, updateInterval)
	}

	stopPriceUpdating(): void {
		if (this.priceUpdater) {
			clearInterval(this.priceUpdater)
			this.priceUpdater = undefined
		}
	}

	/**
	 * Get the price of a currency, cache it and update it every 5 minutes
	 * @param currency - Token, NativeCurrency or WrappedNative
	 */
	async getPrice(
		currency: Currency,
		settings: Partial<PriceOracleSettings> = DEFAULT_SETTINGS,
	): Promise<number> {
		const priceLookupCurrency = await this.getLookupCurrency(currency)

		if (settings.useCachedValues) {
			const currencyState = this.currencyStates.get(
				priceLookupCurrency.id,
			)

			if (currencyState) return currencyState.price
		}

		const tokenPrice = await this.geckoTerminalService.getTokenPrice(
			priceLookupCurrency.address,
			this.getGeckoId(priceLookupCurrency.chainId),
		)

		this.setCurrencyState(priceLookupCurrency, tokenPrice)

		if (settings.updateInterval)
			this.startPriceUpdating(settings.updateInterval)

		return tokenPrice
	}

	/**
	 * Get the price of a currency, cache it and update it every 5 minutes
	 * @param currencies - Array of Token, NativeCurrency or WrappedNative
	 */
	async getPrices(
		currencies: Currency[],
		settings: Partial<PriceOracleSettings> = DEFAULT_SETTINGS,
	): Promise<CurrencyState[]> {
		const unknownCurrencies: Currency[] = []
		const statesToReturn: CurrencyState[] = []

		if (settings.useCachedValues) {
			await this.processCachedCurrencies(
				currencies,
				statesToReturn,
				unknownCurrencies,
			)
		} else {
			unknownCurrencies.push(...currencies)
		}

		const currenciesGroupedByChain =
			this.groupCurrenciesByChain(unknownCurrencies)

		for (const [
			chainId,
			chainCurrencies,
		] of currenciesGroupedByChain.entries()) {
			const currencyStatesOnChain =
				await this.fetchAndUpdateCurrencyStates(
					chainId,
					chainCurrencies,
				)

			statesToReturn.push(...currencyStatesOnChain)
		}

		if (settings.updateInterval)
			this.startPriceUpdating(settings.updateInterval)

		return statesToReturn
	}

	/* ======== PRIVATE METHODS ======== */

	private async fetchAndUpdateCurrencyStates(
		chainId: number,
		currencies: Currency[],
	) {
		const lookupAddresses: Address[] = []

		for (const currency of currencies) {
			const priceLookupCurrency = await this.getLookupCurrency(currency)

			lookupAddresses.push(priceLookupCurrency.address)
		}

		const addressesAndPrices =
			await this.geckoTerminalService.getTokenPrices(
				lookupAddresses,
				this.getGeckoId(chainId),
			)

		const currencyStates: CurrencyState[] = []

		for (const currency of currencies) {
			const priceLookupCurrency = await this.getLookupCurrency(currency)

			const addressAndPrice = addressesAndPrices.find((addressAndPrice) =>
				isAddressEqual(
					addressAndPrice.address,
					priceLookupCurrency.address,
				),
			)

			// should never throw, because the address MUST be in the list
			if (!addressAndPrice) {
				throw new PriceOracleError(
					`Price not found for currency: ${priceLookupCurrency.toString()}`,
				)
			}

			this.setCurrencyState(priceLookupCurrency, addressAndPrice.price)

			currencyStates.push({
				currency,
				price: addressAndPrice.price,
				lastUpdated: Date.now(),
			})
		}

		return currencyStates
	}

	private groupCurrenciesByChain(
		currencies: Currency[],
	): Map<number, Currency[]> {
		const currenciesByChain = new Map<number, Currency[]>()

		for (const currency of currencies) {
			if (!currenciesByChain.has(currency.chainId)) {
				currenciesByChain.set(currency.chainId, [])
			}

			currenciesByChain.get(currency.chainId)!.push(currency)
		}

		return currenciesByChain
	}

	private setCurrencyState(
		currency: Currency,
		price: number,
		lastUpdated?: number,
	) {
		this.currencyStates.set(currency.id, {
			price,
			lastUpdated: lastUpdated ?? Date.now(),
			currency,
		})
	}

	private async getLookupCurrency(currency: Currency): Promise<Currency> {
		return currency.isNative()
			? this.tokenUtils.getWrappedNative(currency.chainId)
			: currency
	}

	private async updatePrices(): Promise<void> {
		const currencyStatesToUpdate = Array.from(this.currencyStates.values())

		const currenciesToUpdate = currencyStatesToUpdate.map((c) => c.currency)

		if (currenciesToUpdate.length > 0) {
			await this.getPrices(currenciesToUpdate, {
				useCachedValues: false, // we are retrieving new prices
				updateInterval: false,
			})
		}
	}

	private getGeckoId(chainId: number): string {
		const chainIdStr = String(chainId) as keyof typeof chainIdToGeckoChainId

		const geckoId = chainIdToGeckoChainId[chainIdStr]

		if (!geckoId) {
			throw new PriceOracleError(
				`Unsupported chainId for PriceOracle: ${chainId}`,
			)
		}

		return geckoId
	}

	private async processCachedCurrencies(
		currencies: Currency[],
		statesToReturn: CurrencyState[],
		unknownCurrencies: Currency[],
	) {
		for (const currency of currencies) {
			const priceLookupCurrency = await this.getLookupCurrency(currency)
			const currencyState = this.currencyStates.get(
				priceLookupCurrency.id,
			)
			if (currencyState) {
				statesToReturn.push({
					currency,
					price: currencyState.price,
					lastUpdated: currencyState.lastUpdated,
				})
			} else {
				unknownCurrencies.push(currency)
			}
		}
	}
}
