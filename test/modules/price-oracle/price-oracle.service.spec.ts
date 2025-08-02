import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { arbitrum, fuse } from 'viem/chains'
import { ChainClientService } from '../../../src/chain-client/chain-client.service'
import { GeckoTerminalService } from '../../../src/modules/price-oracle/gecko-terminal.service'
import { PriceOracleService } from '../../../src/modules/price-oracle/price-oracle.service'
import { PriceOracleSettings } from '../../../src/modules/price-oracle/price-oracle.types'
import { NativeCurrency } from '../../../src/primitives/tokens/NativeCurrency'
import { Token } from '../../../src/primitives/tokens/Token'
import { TokenUtils } from '../../../src/primitives/tokens/TokenUtils'
import { wait } from '../../../src/utils/common'

const WETH_ARB_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' // WETH on Arbitrum
const WBTC_ARB_ADDRESS = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f' // WBTC on Arbitrum
const WETH_FUSE_ADDRESS = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590' // WETH on Fuse

const onlyFetchPrice: PriceOracleSettings = {
	updateInterval: false,
	useCachedValues: false,
}

describe('Price Oracle', () => {
	let wethToken: Token
	let ethNative: NativeCurrency
	let fuseNative: NativeCurrency
	let wethTokenFuse: Token
	let wbtcToken: Token

	// Shared services created once via DI
	let tokenUtils: TokenUtils
	let chainClientService: ChainClientService

	beforeAll(async () => {
		// Create the testing module once to get shared services
		const sharedModule: TestingModule = await Test.createTestingModule({
			providers: [TokenUtils, ChainClientService],
		}).compile()

		// Get shared service instances
		tokenUtils = sharedModule.get(TokenUtils)
		chainClientService = sharedModule.get(ChainClientService)

		// Initialize tokens once using DI-created tokenUtils
		wethToken = await tokenUtils.fromAddress<Token>(
			WETH_ARB_ADDRESS,
			arbitrum.id,
		)
		ethNative = tokenUtils.getNative(arbitrum.id)
		wethTokenFuse = await tokenUtils.fromAddress<Token>(
			WETH_FUSE_ADDRESS,
			fuse.id,
		)
		wbtcToken = await tokenUtils.fromAddress<Token>(
			WBTC_ARB_ADDRESS,
			arbitrum.id,
		)
		fuseNative = tokenUtils.getNative(fuse.id)
	})

	describe('getPrice - Real GeckoTerminal API', () => {
		let priceOracleService: PriceOracleService

		beforeEach(async () => {
			// Create fresh testing module for PriceOracleService only
			// Use existing instances for dependencies
			const app: TestingModule = await Test.createTestingModule({
				providers: [
					PriceOracleService,
					{
						provide: TokenUtils,
						useValue: tokenUtils, // Reuse existing instance
					},
					{
						provide: ChainClientService,
						useValue: chainClientService, // Reuse existing instance
					},
					GeckoTerminalService,
					Logger,
				],
			}).compile()

			priceOracleService = app.get(PriceOracleService)
		})

		it('should return price for token', async () => {
			const price = await priceOracleService.getPrice(
				wethToken,
				onlyFetchPrice,
			)

			expect(typeof price).toBe('number')
			expect(price).toBeGreaterThan(1000)
			expect(price).toBeLessThan(10000)
		})

		it('should return price for native currency', async () => {
			const price = await priceOracleService.getPrice(
				ethNative,
				onlyFetchPrice,
			)

			expect(typeof price).toBe('number')
			expect(price).toBeGreaterThan(1000)
			expect(price).toBeLessThan(10000)
		})

		it('should return same price for native currency and wrapped native', async () => {
			const [nativePrice, wrappedPrice] = await Promise.all([
				priceOracleService.getPrice(ethNative, onlyFetchPrice),
				priceOracleService.getPrice(wethToken, onlyFetchPrice),
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

			const results = await priceOracleService.getPrices(
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
				chainClientService,
				'0x1234567890123456789012345678901234567890',
				99999, // Invalid chain ID
				{
					symbol: 'TEST',
					decimals: 18,
					name: 'Test Token',
				},
			)

			await expect(
				priceOracleService.getPrice(invalidToken, onlyFetchPrice),
			).rejects.toThrow('Unsupported chainId for PriceOracle: 99999')
		})
	})

	describe('getPrices - Mock GeckoTerminal API', () => {
		let mockGeckoTerminalService: jest.Mocked<
			Pick<GeckoTerminalService, 'getTokenPrice' | 'getTokenPrices'>
		>
		let priceOracleService: PriceOracleService

		beforeEach(async () => {
			mockGeckoTerminalService = {
				getTokenPrice: jest.fn().mockResolvedValue(3000),
				getTokenPrices: jest
					.fn()
					.mockResolvedValue([
						{ address: wethToken.address, price: 2500 },
					]),
			}

			// Create fresh testing module for PriceOracleService only
			// Use existing instances for dependencies
			const app: TestingModule = await Test.createTestingModule({
				providers: [
					PriceOracleService,
					{
						provide: TokenUtils,
						useValue: tokenUtils, // Reuse existing instance
					},
					{
						provide: ChainClientService,
						useValue: chainClientService, // Reuse existing instance
					},
					{
						provide: GeckoTerminalService,
						useValue: mockGeckoTerminalService,
					},
					Logger,
				],
			}).compile()

			priceOracleService = app.get(PriceOracleService)
		})

		afterEach(() => {
			jest.clearAllMocks()
		})

		it('should use cached prices when useCache is true', async () => {
			// First call - should fetch from API
			const price1 = await priceOracleService.getPrice(
				wethToken,
				onlyFetchPrice,
			)
			expect(
				mockGeckoTerminalService.getTokenPrice,
			).toHaveBeenCalledTimes(1)

			// Second call with cache enabled - should NOT call API
			const price2 = await priceOracleService.getPrice(wethToken, {
				useCachedValues: true,
				updateInterval: false,
			})
			expect(
				mockGeckoTerminalService.getTokenPrice,
			).toHaveBeenCalledTimes(1) // Still only 1 call
			expect(price1).toBe(price2)
		})

		it('should bypass cache when useCache is false', async () => {
			// First call
			await priceOracleService.getPrice(wethToken, onlyFetchPrice)
			expect(
				mockGeckoTerminalService.getTokenPrice,
			).toHaveBeenCalledTimes(1)

			// Second call with cache disabled - should call API again
			await priceOracleService.getPrice(wethToken, onlyFetchPrice)
			expect(
				mockGeckoTerminalService.getTokenPrice,
			).toHaveBeenCalledTimes(2)
		})

		it('should update cache after fetching new prices', async () => {
			// @ts-expect-error - private property
			expect(priceOracleService.currencyStates.size).toBe(0)
			// Fetch price - should update cache
			await priceOracleService.getPrice(wethToken, onlyFetchPrice)

			// Check cache was updated by calling with cache enabled
			const cachedPrice = await priceOracleService.getPrice(wethToken, {
				useCachedValues: true,
				updateInterval: false,
			})

			expect(cachedPrice).toBe(3000)
			expect(
				mockGeckoTerminalService.getTokenPrice,
			).toHaveBeenCalledTimes(1) // Only one API call
		})

		it('getPrice: should not start price updating when updateInterval is false', async () => {
			// Get price with updateInterval = false
			await priceOracleService.getPrice(wethToken, {
				useCachedValues: false,
				updateInterval: false,
			})

			// Price updater should still be undefined (not started)
			// @ts-expect-error - private property
			expect(priceOracleService.priceUpdater).toBeUndefined()
		})

		it('getPrices: should not start price updating when updateInterval is false', async () => {
			// Get prices with updateInterval = false
			await priceOracleService.getPrices([wethToken], {
				useCachedValues: false,
				updateInterval: false,
			})

			// Price updater should still be undefined (not started)
			// @ts-expect-error - private property
			expect(priceOracleService.priceUpdater).toBeUndefined()
		})

		it('getPrice: should start price updating with custom interval', async () => {
			// Get price with custom updateInterval
			await priceOracleService.getPrice(wethToken, {
				useCachedValues: false,
				updateInterval: 50, // 1 second for testing
			})

			// Price updater should now be running
			// @ts-expect-error - private property
			expect(priceOracleService.priceUpdater).toBeDefined()

			await wait(100)

			// Should have been called again due to the interval
			expect(
				mockGeckoTerminalService.getTokenPrice,
			).toHaveBeenCalledTimes(1)
			expect(
				mockGeckoTerminalService.getTokenPrices,
			).toHaveBeenCalledTimes(1)
		})

		it('getPrices: should start price updating with custom interval', async () => {
			// Get prices with custom updateInterval
			await priceOracleService.getPrices([wethToken], {
				useCachedValues: false,
				updateInterval: 50, // 1 second for testing
			})

			// Price updater should now be running
			// @ts-expect-error - private property
			expect(priceOracleService.priceUpdater).toBeDefined()

			await wait(100)

			// Should have been called again due to the interval
			expect(
				mockGeckoTerminalService.getTokenPrices,
			).toHaveBeenCalledTimes(2)
		})
	})
})
