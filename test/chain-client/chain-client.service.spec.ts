import { Test, TestingModule } from '@nestjs/testing'
import { defineChain } from 'viem'
import { ChainClientConfigService } from '../../src/chain-client/chain-client-config.service'
import { ChainClientService } from '../../src/chain-client/chain-client.service'

describe('ChainClientService', () => {
	let service: ChainClientService
	let mockConfigService: Partial<ChainClientConfigService>

	// Define the custom Glue chain
	const glueChain = defineChain({
		id: 1300,
		name: 'glue',
		nativeCurrency: {
			name: 'glue',
			symbol: 'glue',
			decimals: 18,
		},
		rpcUrls: {
			default: {
				http: ['https://rpc.glue.net'],
			},
		},
	})

	beforeEach(async () => {
		mockConfigService = {}
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ChainClientService,
				{
					provide: ChainClientConfigService,
					useValue: mockConfigService,
				},
			],
		}).compile()

		service = module.get<ChainClientService>(ChainClientService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getClient', () => {
		it('should create client with customChain and retrieve chainId', async () => {
			mockConfigService.customChains = [glueChain]

			const client = service.getClient(1300)

			const chainId = await client.getChainId()

			expect(chainId).toBe(1300)
		})

		it('should create client with transport with multiple rpc', () => {
			mockConfigService.customChains = [glueChain]
			mockConfigService.rpcUrls = {
				1300: ['https://rpc2.glue.net', 'https://rpc3.glue.net'],
			}

			const client = service.getClient(1300)

			expect(client.transport.transports.length).toBe(3)
		})
	})
})
