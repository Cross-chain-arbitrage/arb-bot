import { arbitrum, fuse } from 'viem/chains'
import {
	Currency,
	CurrencyId,
	PriceOracle,
} from '../../src/modules/PriceOracle/PriceOracle'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { makeSuite } from '../testUtils/makeSuite'

const WETH_ARB_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' // WETH on Arbitrum
const USDT_ARB_ADDRESS = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' // USDT on Arbitrum
const WBTC_ARB_ADDRESS = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f' // WBTC on Arbitrum
const WETH_FUSE_ADDRESS = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590' // WETH on Fuse

class PriceOracleHarness extends PriceOracle {
	public static prices = new Map<CurrencyId, number>()
	public static currenciesToUpdate = new Map<CurrencyId, Currency>()
	public static priceUpdater: NodeJS.Timeout | undefined
}

const shouldUpdateFalse = false

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
		PriceOracleHarness.stopPriceUpdating()

		// Clear the price cache for clean tests
		PriceOracleHarness.prices.clear()
		PriceOracleHarness.currenciesToUpdate.clear()
	})

	afterEach(() => {
		PriceOracleHarness.stopPriceUpdating()
	})

	describe('getPrice - Real GeckoTerminal API', () => {
		it('should return price for token', async () => {
			const price = await PriceOracleHarness.getPrice(
				wethToken,
				shouldUpdateFalse,
			)

			expect(typeof price).toBe('number')
			expect(price).toBeGreaterThan(1000)
			expect(price).toBeLessThan(10000)
		})

		it('should return price for native currency', async () => {
			const price = await PriceOracleHarness.getPrice(
				ethNative,
				shouldUpdateFalse,
			)

			expect(typeof price).toBe('number')
			expect(price).toBeGreaterThan(1000)
			expect(price).toBeLessThan(10000)
		})

		it('should return same price for native currency and wrapped native', async () => {
			const [nativePrice, wrappedPrice] = await Promise.all([
				PriceOracleHarness.getPrice(ethNative, false),
				PriceOracleHarness.getPrice(wethToken, false),
			])

			expect(nativePrice).toBe(wrappedPrice)
		})

		it('should cache prices and return cached value on second call', async () => {
			const price1 = await PriceOracleHarness.getPrice(wethToken, false)

			// Second call - should return cached value
			const startTime = Date.now()
			const price2 = await PriceOracleHarness.getPrice(wethToken, false)
			const endTime = Date.now()

			expect(price1).toBe(price2)
			// Second call should be much faster (cached)
			expect(endTime - startTime).toBeLessThan(100)
		})

		it('should return prices for 3 tokens (with wrapped native) and 2 natives', async () => {
			const allCurrencies = [
				wethToken,
				wethTokenFuse,
				wbtcToken,
				ethNative,
				fuseNative,
			]

			const results = await PriceOracleHarness.getPrices(
				allCurrencies,
				false,
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
				PriceOracleHarness.getPrice(invalidToken, false),
			).rejects.toThrow('Unsupported chainId for PriceOracle: 99999')
		})
	})
})
