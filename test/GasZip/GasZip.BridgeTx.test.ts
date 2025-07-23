import { zeroHash } from 'viem'
import { arbitrum, superposition } from 'viem/chains'
import { GasZipBridgeTx } from '../../src/bridges/GasZip/GasZipBridgeTx'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GasZip ~ GasZipBridgeTx', () => {
	describe('Bridge Tx object creation', () => {
		it('MUST be creatable', () => {
			const srcToken = TokenUtils.getNative(superposition.id)
			const dstToken = TokenUtils.getNative(arbitrum.id)
			const amount = srcToken.parseUnits('1')

			const tx = new GasZipBridgeTx(zeroHash, srcToken, dstToken, amount)

			expect(tx).toBeDefined()
			expect(tx.srcTxHash).toBe(zeroHash)
			expect(tx.srcToken).toBe(srcToken)
			expect(tx.dstToken).toBe(dstToken)
			expect(tx.amount).toBe(amount)
		})

		it('MUST throw on same src and dst tokens', () => {
			const srcToken = TokenUtils.getNative(superposition.id)
			const dstToken = TokenUtils.getNative(superposition.id)
			const amount = srcToken.parseUnits('1')

			expect(
				() => new GasZipBridgeTx(zeroHash, srcToken, dstToken, amount),
			).toThrow('Source and destination tokens cannot be the same')
		})

		it('MUST throw on 0 amount', () => {
			const srcToken = TokenUtils.getNative(superposition.id)
			const dstToken = TokenUtils.getNative(arbitrum.id)
			const amount = 0n

			expect(
				() => new GasZipBridgeTx(zeroHash, srcToken, dstToken, amount),
			).toThrow('Amount cannot be 0')
		})
	})

	describe('waitForBridgeToFinish', () => {
		it('MUST return tx hash', async () => {
			const srcToken = TokenUtils.getNative(superposition.id)
			const dstToken = TokenUtils.getNative(arbitrum.id)
			const amount = srcToken.parseUnits('1')

			const tx = new GasZipBridgeTx(
				'0xa9a272b1f0f20da6d5cad6565d952639df279e224ed2ef0754b12b06d2037383',
				srcToken,
				dstToken,
				amount,
			)

			await tx.waitForBridgeToFinish()

			expect(tx.dstTx).toBeDefined()
			expect(tx.dstTx?.hash).toBeDefined()
		})

		it('MUST fail on timeout for incorrect tx hash', async () => {
			const srcToken = TokenUtils.getNative(superposition.id)
			const dstToken = TokenUtils.getNative(arbitrum.id)
			const amount = srcToken.parseUnits('1')

			const tx = new GasZipBridgeTx(
				'0x0000000000000000000000000000000000000000000000000000000000000001',
				srcToken,
				dstToken,
				amount,
				100,
			)

			await expect(() => tx.waitForBridgeToFinish()).rejects.toThrow(
				'Polling Timeout',
			)
		})
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
