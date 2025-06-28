import { arbitrum, fuse } from 'viem/chains'
import { GeckoTerminalAPI } from '../../src/dataApi/geckoterminal/GeckoTerminalAPI'
import { PriceOracle } from '../../src/modules/PriceOracle/PriceOracle'
import { PriceOracleSettings } from '../../src/modules/PriceOracle/types'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { wait } from '../../src/utils/common'
import { makeSuite } from '../testUtils/makeSuite'

const WETH_ARB_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' // WETH on Arbitrum
const USDT_ARB_ADDRESS = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' // USDT on Arbitrum
const WBTC_ARB_ADDRESS = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f' // WBTC on Arbitrum
const WETH_FUSE_ADDRESS = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590' // WETH on Fuse

const onlyFetchPrice: Partial<PriceOracleSettings> = {
	updateInterval: false,
	useCache: false,
}

makeSuite('Price Oracle', () => {
	let wethToken: Token
	let ethNative: NativeCurrency
	let fuseNative: NativeCurrency
	let wethTokenFuse: Token
	let wbtcToken: Token

	beforeAll(async () => {
		wethToken = await TokenUtils.fromAddress<Token>(
			WETH_ARB_ADDRESS,
			arbitrum.id,
		)
		ethNative = TokenUtils.getNative(arbitrum.id)
		wethTokenFuse = await TokenUtils.fromAddress<Token>(
			WETH_FUSE_ADDRESS,
			fuse.id,
		)
		wbtcToken = await TokenUtils.fromAddress<Token>(
			WBTC_ARB_ADDRESS,
			arbitrum.id,
		)
		fuseNative = TokenUtils.getNative(fuse.id)
	})

	beforeEach(() => {
		PriceOracle.stopPriceUpdating()

		// Clear the price cache for clean tests
		// @ts-expect-error - private property
		PriceOracle.currencyStates.clear()
	})

	afterEach(() => {
		PriceOracle.stopPriceUpdating()
	})

	describe('getPrice - Real GeckoTerminal API', () => {
		it('should return price for token', async () => {
			const price = await PriceOracle.getPrice(wethToken, onlyFetchPrice)

			expect(typeof price).toBe('number')
			expect(price).toBeGreaterThan(1000)
			expect(price).toBeLessThan(10000)
		})

		it('should return price for native currency', async () => {
			const price = await PriceOracle.getPrice(ethNative, onlyFetchPrice)

			expect(typeof price).toBe('number')
			expect(price).toBeGreaterThan(1000)
			expect(price).toBeLessThan(10000)
		})

		it('should return same price for native currency and wrapped native', async () => {
			const [nativePrice, wrappedPrice] = await Promise.all([
				PriceOracle.getPrice(ethNative, onlyFetchPrice),
				PriceOracle.getPrice(wethToken, onlyFetchPrice),
			])

			expect(nativePrice).toBe(wrappedPrice)
		})

		it('should return prices for 3 tokens (with wrapped native) and 2 natives', async () => {
			const allCurrencies = [
				wethToken,
				wethTokenFuse,
				wbtcToken,
				ethNative,
				fuseNative,
			]

			const results = await PriceOracle.getPrices(
				allCurrencies,
				onlyFetchPrice,
			)

			// Should return prices for all 6 currencies
			expect(results).toHaveLength(5)

			// Each result should have currency and price
			results.forEach((result) => {
				expect(result).toHaveProperty('currency')
				expect(result.price).toBeGreaterThan(0)
			})

			// Verify we have the correct currencies
			const returnedCurrencyIds = results.map((r) => r.currency.id)
			const expectedCurrencyIds = allCurrencies.map((c) => c.id)

			expect(returnedCurrencyIds.sort()).toEqual(
				expectedCurrencyIds.sort(),
			)

			// ETH prices (native and wrapped) should be the same
			const ethNativeResult = results.find(
				(r) => r.currency.id === ethNative.id,
			)
			const wethTokenResult = results.find(
				(r) => r.currency.id === wethToken.id,
			)

			expect(ethNativeResult?.price).toBe(wethTokenResult?.price)
		})

		it('should throw error for unsupported chain', async () => {
			// Create a token with an unsupported chain ID
			const invalidToken = new Token(
				'0x1234567890123456789012345678901234567890',
				99999, // Invalid chain ID
				'TEST',
				18,
				'Test Token',
			)

			await expect(
				PriceOracle.getPrice(invalidToken, onlyFetchPrice),
			).rejects.toThrow('Unsupported chainId for PriceOracle: 99999')
		})
	})

	describe('getPrices - Mock GeckoTerminal API', () => {
		let mockGetTokenPrice: jest.SpyInstance
		let mockGetTokenPrices: jest.SpyInstance

		beforeEach(() => {
			jest.clearAllMocks()

			mockGetTokenPrice = jest
				.spyOn(GeckoTerminalAPI, 'getTokenPrice')
				.mockResolvedValue(3000)

			mockGetTokenPrices = jest
				.spyOn(GeckoTerminalAPI, 'getTokenPrices')
				.mockResolvedValue([
					{ address: wethToken.address, price: 2500 },
				])
		})

		afterEach(() => {
			jest.clearAllMocks()
		})

		it('should use cached prices when useCache is true', async () => {
			// First call - should fetch from API
			const price1 = await PriceOracle.getPrice(wethToken, onlyFetchPrice)
			expect(mockGetTokenPrice).toHaveBeenCalledTimes(1)

			// Second call with cache enabled - should NOT call API
			const price2 = await PriceOracle.getPrice(wethToken, {
				useCache: true,
				updateInterval: false,
			})
			expect(mockGetTokenPrice).toHaveBeenCalledTimes(1) // Still only 1 call
			expect(price1).toBe(price2)
		})

		it('should bypass cache when useCache is false', async () => {
			// First call
			await PriceOracle.getPrice(wethToken, onlyFetchPrice)
			expect(mockGetTokenPrice).toHaveBeenCalledTimes(1)

			// Second call with cache disabled - should call API again
			await PriceOracle.getPrice(wethToken, onlyFetchPrice)
			expect(mockGetTokenPrice).toHaveBeenCalledTimes(2)
		})

		it('should update cache after fetching new prices', async () => {
			// @ts-expect-error - private property
			expect(PriceOracle.currencyStates.size).toBe(0)
			// Fetch price - should update cache
			await PriceOracle.getPrice(wethToken, onlyFetchPrice)

			// Check cache was updated by calling with cache enabled
			const cachedPrice = await PriceOracle.getPrice(wethToken, {
				useCache: true,
				updateInterval: false,
			})

			expect(cachedPrice).toBe(3000)
			expect(mockGetTokenPrice).toHaveBeenCalledTimes(1) // Only one API call
		})

		it('getPrice: should not start price updating when updateInterval is false', async () => {
			// Get price with updateInterval = false
			await PriceOracle.getPrice(wethToken, {
				useCache: false,
				updateInterval: false,
			})

			// Price updater should still be undefined (not started)
			// @ts-expect-error - private property
			expect(PriceOracle.priceUpdater).toBeUndefined()
		})

		it('getPrices: should not start price updating when updateInterval is false', async () => {
			// Get prices with updateInterval = false
			await PriceOracle.getPrices([wethToken], {
				useCache: false,
				updateInterval: false,
			})

			// Price updater should still be undefined (not started)
			// @ts-expect-error - private property
			expect(PriceOracle.priceUpdater).toBeUndefined()
		})

		it('getPrice: should start price updating with custom interval', async () => {
			// Get price with custom updateInterval
			await PriceOracle.getPrice(wethToken, {
				useCache: false,
				updateInterval: 50, // 1 second for testing
			})

			// Price updater should now be running
			// @ts-expect-error - private property
			expect(PriceOracle.priceUpdater).toBeDefined()

			await wait(100)

			// Should have been called again due to the interval
			expect(mockGetTokenPrice).toHaveBeenCalledTimes(1)
			expect(mockGetTokenPrices).toHaveBeenCalledTimes(1)
		})

		it('getPrices: should start price updating with custom interval', async () => {
			// Get prices with custom updateInterval
			await PriceOracle.getPrices([wethToken], {
				useCache: false,
				updateInterval: 50, // 1 second for testing
			})

			// Price updater should now be running
			// @ts-expect-error - private property
			expect(PriceOracle.priceUpdater).toBeDefined()

			await wait(100)

			// Should have been called again due to the interval
			expect(mockGetTokenPrices).toHaveBeenCalledTimes(2)
		})
	})
})
