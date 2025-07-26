import { parseEther } from 'viem'
import { arbitrum, fuse, superposition, tronShasta } from 'viem/chains'
import {
	GasZipBridge,
	GasZipQuote,
} from '../../src/bridges/GasZip/GasZipBridge'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GasZip ~ quote()', () => {
	function validateQuote(
		quote: GasZipQuote,
		tokenOut: NativeCurrency,
		tokenIn: NativeCurrency,
		amount: bigint,
	) {
		expect(quote).toBeDefined()
		expect(quote.chain).toBe(tokenOut.chainId)
		expect(quote.decimals).toBe(tokenIn.decimals)

		expect(quote.expected).toBeGreaterThan((amount * 99n) / 100n)
		expect(quote.expected).toBeLessThanOrEqual(amount)

		expect(quote.expectedNative).toBe(quote.expected)
		expect(quote.gas).toBe(0)
		expect(quote.speed).toBeGreaterThanOrEqual(1)
		expect(quote.usd).toBeGreaterThan(200)
	}

	it('MUST quote Arbitrum -> Superposition', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('0.1')

		const quote = await GasZipBridge.quote(tokenIn, tokenOut, amount)

		validateQuote(quote, tokenOut, tokenIn, amount)
	})

	it('MUST THROW on quoting NON-ETH -> ETH', async () => {
		const tokenIn = TokenUtils.getNative(fuse.id)
		const tokenOut = TokenUtils.getNative(arbitrum.id)
		const amountIn = tokenIn.parseUnits('0.01')

		await expect(() =>
			GasZipBridge.quote(tokenIn, tokenOut, amountIn),
		).rejects.toThrow(`Bridge from non ETH token is not supported`)
	})

	it('MUST THROW on quoting ETH -> NON-ETH', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(fuse.id)
		const amountIn = tokenIn.parseUnits('0.01')

		await expect(() =>
			GasZipBridge.quote(tokenIn, tokenOut, amountIn),
		).rejects.toThrow(`Bridge to non ETH token is not supported`)
	})

	it('MUST quote Superposition -> Arbitrum', async () => {
		const tokenIn = TokenUtils.getNative(superposition.id)
		const tokenOut = TokenUtils.getNative(arbitrum.id)
		const amount = tokenIn.parseUnits('0.1')

		const quote = await GasZipBridge.quote(tokenIn, tokenOut, amount)

		validateQuote(quote, tokenOut, tokenIn, amount)
	})

	it('MUST quote Arbitrum -> Hemi', async () => {
		const tokenIn = TokenUtils.getNative(superposition.id)
		const tokenOut = TokenUtils.getNative(arbitrum.id)
		const amount = tokenIn.parseUnits('0.1')

		const quote = await GasZipBridge.quote(tokenIn, tokenOut, amount)

		validateQuote(quote, tokenOut, tokenIn, amount)
	})

	it('MUST quote Hemi -> Arbitrum', async () => {
		const tokenIn = TokenUtils.getNative(superposition.id)
		const tokenOut = TokenUtils.getNative(arbitrum.id)
		const amount = tokenIn.parseUnits('0.1')

		const quote = await GasZipBridge.quote(tokenIn, tokenOut, amount)

		validateQuote(quote, tokenOut, tokenIn, amount)
	})

	it('MUST throw on unsupported source chain', async () => {
		const tokenIn = new NativeCurrency(
			tronShasta.id,
			'Unsupported',
			'UNSUPPORTED',
		)

		const tokenOut = TokenUtils.getNative(arbitrum.id)
		const amount = tokenIn.parseUnits('0.1')

		await expect(
			GasZipBridge.quote(tokenIn, tokenOut, amount),
		).rejects.toThrow(`Source chain ${tokenIn.chainId} is not supported`)
	})

	it('MUST throw on unsupported destination chain', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = new NativeCurrency(
			1234567890,
			'Unsupported',
			'UNSUPPORTED',
		)
		const amount = tokenIn.parseUnits('0.1')

		await expect(
			GasZipBridge.quote(tokenIn, tokenOut, amount),
		).rejects.toThrow(
			`Destination chain ${tokenOut.chainId} is not supported`,
		)
	})

	it('MUST throw on small amountIn', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('0.000000000000000001')

		await expect(
			GasZipBridge.quote(tokenIn, tokenOut, amount),
		).rejects.toThrow(`Amount ${amount} is too small`)
	})

	it('MUST throw on inadequately big amountIn', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('0.375')

		await expect(
			GasZipBridge.quote(tokenIn, tokenOut, amount),
		).rejects.toThrow(`Amount ${amount} exceeds manually set bridge limit`)
	})

	it('MUST throw on amountIn exceeding manually set bridge limit', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('1')

		await expect(
			GasZipBridge.quote(tokenIn, tokenOut, amount),
		).rejects.toThrow(`Amount ${amount} exceeds manually set bridge limit`)
	})

	it('MUST throw on amountIn exceeding GasZip bridge capability', async () => {
		jest.spyOn(GasZipBridge, 'getSecurityBridgeLimit').mockReturnValue(
			parseEther('31'),
		)

		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('30')

		await expect(
			GasZipBridge.quote(tokenIn, tokenOut, amount),
		).rejects.toThrow(
			`Amount ${amount} is too big and cannot be fulfilled right no`,
		)
	})

	describe('Error Handling', () => {
		beforeEach(() => {
			global.fetch = jest.fn().mockImplementation(() => {
				throw new Error('HTTP Request Error')
			})
		})

		afterEach(() => {
			jest.resetAllMocks()
		})

		it('MUST throw on GasZip API error with Error message', async () => {
			const tokenIn = TokenUtils.getNative(arbitrum.id)
			const tokenOut = TokenUtils.getNative(superposition.id)
			const amount = tokenIn.parseUnits('0.1')

			await expect(
				GasZipBridge.quote(tokenIn, tokenOut, amount),
			).rejects.toThrow('Error: HTTP Request Error')
		})
	})
})
