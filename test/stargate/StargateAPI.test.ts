import { arbitrum, base, fuse } from 'viem/chains'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { zeroAddress } from 'viem'
import { makeSuite } from '../utils/makeSuite'
import { StargateAPI } from '../../src/bridges/Stargate/StargateAPI'

makeSuite('StargateAPI', () => {
	it('should get tokens metadata', async () => {
		const tokens = await StargateAPI.getTokensMetadata('fuse')

		expect(tokens.length).toBeGreaterThan(0)
	})

	it('should get token metadata', async () => {
		const tokenMetadata = await StargateAPI.getTokenMetadata(
			new NativeCurrency(arbitrum.id, 'ETH', 'Ethereum'),
			'arbitrum',
		)

		expect(tokenMetadata.token.symbol).toBe('ETH')
		expect(tokenMetadata.token.address).toBe(zeroAddress)
	})

	it('MUST throw on unknown native currency', async () => {
		await expect(
			StargateAPI.getTokenMetadata(
				new NativeCurrency(fuse.id, 'FUSE', 'FUSE'),
				'fuse',
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
				'base',
			),
		).rejects.toThrow()
	})
})
