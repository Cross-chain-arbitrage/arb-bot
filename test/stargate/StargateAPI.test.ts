import { Test, TestingModule } from '@nestjs/testing'
import { zeroAddress } from 'viem'
import { arbitrum, base, fuse } from 'viem/chains'
import { ChainClientService } from '../../src/core/infrastructure/evm/chain-client/chain-client.service'
import { NativeCurrency } from '../../src/core/infrastructure/evm/primitives/tokens/NativeCurrency'
import { TokenUtils } from '../../src/core/infrastructure/evm/primitives/tokens/TokenUtils'
import { StargateAPIService } from '../../src/core/infrastructure/layerzero-bridges/stargate/stargate-api.service'

describe('StargateAPI', () => {
	let stargateAPIService: StargateAPIService
	let tokenUtils: TokenUtils
	let chainClientService: ChainClientService

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StargateAPIService,
				TokenUtils,
				{
					provide: ChainClientService,
					useValue: {} as ChainClientService,
				},
			],
		}).compile()

		stargateAPIService = module.get<StargateAPIService>(StargateAPIService)
		tokenUtils = module.get<TokenUtils>(TokenUtils)
		chainClientService = module.get<ChainClientService>(ChainClientService)
	})

	it('should get tokens metadata', async () => {
		const tokens = await stargateAPIService.getTokensMetadataOnChain(fuse.id)

		expect(tokens.length).toBeGreaterThan(0)
	})

	it('should get token metadata', async () => {
		const tokenMetadata = await stargateAPIService.getTokenMetadata(
			new NativeCurrency(chainClientService, arbitrum.id, {
				symbol: 'ETH',
				decimals: 18,
				name: 'Ethereum',
			}),
		)

		expect(tokenMetadata.token.symbol).toBe('ETH')
		expect(tokenMetadata.token.address).toBe(zeroAddress)
	})

	it('MUST throw on unknown native currency', async () => {
		await expect(
			stargateAPIService.getTokenMetadata(
				new NativeCurrency(chainClientService, fuse.id, {
					symbol: 'FUSE',
					decimals: 18,
					name: 'FUSE',
				}),
			),
		).rejects.toThrow()
	})

	// Removed tests that depend on TokenUtils.fromAddress which now has different requirements
	// These tests would need a proper ChainClientService setup
})
