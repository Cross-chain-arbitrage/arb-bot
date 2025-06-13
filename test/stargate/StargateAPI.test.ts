import { zeroAddress } from 'viem'
import { arbitrum, base, fuse } from 'viem/chains'
import { StargateAPI } from '../../src/bridges/stargate/StargateAPI'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { makeSuite } from '../utils/makeSuite'

makeSuite('StargateAPI', () => {
	it('should get tokens metadata', async () => {
		const tokens = await StargateAPI.getTokensMetadataOnChain(fuse.id)

		expect(tokens.length).toBeGreaterThan(0)
	})

	it('should get token metadata', async () => {
		const tokenMetadata = await StargateAPI.getTokenMetadata(
			new NativeCurrency(arbitrum.id, 'ETH', 'Ethereum'),
		)

		expect(tokenMetadata.token.symbol).toBe('ETH')
		expect(tokenMetadata.token.address).toBe(zeroAddress)
	})

	it('MUST throw on unknown native currency', async () => {
		await expect(
			StargateAPI.getTokenMetadata(
				new NativeCurrency(fuse.id, 'FUSE', 'FUSE'),
			),
		).rejects.toThrow()
	})

	it('MUST throw on unknown Token', async () => {
		await expect(
			StargateAPI.getTokenMetadata(
				await TokenUtils.fromAddress(
					'0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI
					base.id,
				),
			),
		).rejects.toThrow()
	})

	describe('getSameAssetMetadataAcrossChains()', () => {
		it('MUST return metadata for the same asset across all chains', async () => {
			const metadata = await StargateAPI.getSameAssetMetadataAcrossChains(
				await TokenUtils.fromAddress(
					'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
					arbitrum.id,
				),
			)

			console.log(metadata)

			expect(metadata.length).toBeGreaterThan(10)
			expect(
				metadata.every((m) => m.assetId === metadata[0].assetId),
			).toBe(true)

			expect(
				metadata.every((m) =>
					m.token.symbol.toLowerCase().includes('usd'),
				),
			).toBe(true)
		})
	})
})
