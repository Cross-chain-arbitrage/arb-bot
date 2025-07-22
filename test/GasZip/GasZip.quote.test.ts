import { arbitrum, superposition, tronShasta } from 'viem/chains'
import {
	GasZipBridge,
	GasZipQuote,
} from '../../src/bridges/GasZip/GasZipBridge'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GasZip', () => {
	describe('quote', () => {
		function validateQuote(
			quote: GasZipQuote,
			dstChainId: number,
			tokenIn: NativeCurrency,
			amount: bigint,
		) {
			expect(quote).toBeDefined()
			expect(quote.chain).toBe(dstChainId)
			expect(quote.decimals).toBe(tokenIn.decimals)

			expect(quote.expected).toBeGreaterThan((amount * 99n) / 100n)
			expect(quote.expected).toBeLessThan(amount)

			expect(quote.expectedNative).toBe(quote.expected)
			expect(quote.gas).toBe(0)
			expect(quote.speed).toBeGreaterThanOrEqual(1)
			expect(quote.usd).toBeGreaterThan(200)
		}

		it('MUST quote Arbitrum -> Superposition', async () => {
			const tokenIn = TokenUtils.getNative(arbitrum.id)
			const dstChainId = superposition.id
			const amount = tokenIn.parseUnits('0.1')

			const quote = await GasZipBridge.quote(
				tokenIn,
				dstChainId,
				amount,
				'0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB',
			)

			validateQuote(quote, dstChainId, tokenIn, amount)
		})

		it('MUST quote Superposition -> Arbitrum', async () => {
			const tokenIn = TokenUtils.getNative(superposition.id)
			const dstChainId = arbitrum.id
			const amount = tokenIn.parseUnits('0.1')

			const quote = await GasZipBridge.quote(
				tokenIn,
				dstChainId,
				amount,
				'0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB',
			)

			validateQuote(quote, dstChainId, tokenIn, amount)
		})

		it('MUST quote Arbitrum -> Hemi', async () => {
			const tokenIn = TokenUtils.getNative(superposition.id)
			const dstChainId = arbitrum.id
			const amount = tokenIn.parseUnits('0.1')

			const quote = await GasZipBridge.quote(
				tokenIn,
				dstChainId,
				amount,
				'0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB',
			)

			validateQuote(quote, dstChainId, tokenIn, amount)
		})

		it('MUST quote Hemi -> Arbitrum', async () => {
			const tokenIn = TokenUtils.getNative(superposition.id)
			const dstChainId = arbitrum.id
			const amount = tokenIn.parseUnits('0.1')

			const quote = await GasZipBridge.quote(
				tokenIn,
				dstChainId,
				amount,
				'0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB',
			)

			validateQuote(quote, dstChainId, tokenIn, amount)
		})

		it('MUST throw on unsupported source chain', async () => {
			const tokenIn = new NativeCurrency(
				tronShasta.id,
				'Unsupported',
				'UNSUPPORTED',
			)

			const dstChainId = arbitrum.id
			const amount = tokenIn.parseUnits('0.1')

			await expect(
				GasZipBridge.quote(
					tokenIn,
					dstChainId,
					amount,
					'0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB',
				),
			).rejects.toThrow(
				`Source chain ${tokenIn.chainId} is not supported`,
			)
		})

		it('MUST throw on unsupported destination chain', () => {})
		it('MUST throw on small amountIn', () => {})
		it('MUST throw on inadequately big amountIn', () => {})
		it('MUST throw on small amountIn', () => {})
	})

	// describe('bridge', () => {
	// 	it('should return tx hash', () => {
	// 		const txHash = GasZipBridge.bridge(
	// 			TokenUtils.getNative(superposition.id),
	// 			superposition.id,
	// 		)
	// 	})
	// })
})
