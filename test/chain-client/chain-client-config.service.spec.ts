// TODO: implement configuration tests

// import { ConfigService } from '@nestjs/config'
// import { Test, TestingModule } from '@nestjs/testing'
// import { ChainClientConfigService } from '../../src/chain-client/chain-client-config.service'

// describe('ChainClientConfigService', () => {
// 	let service: ChainClientConfigService
// 	let configServiceGetter: jest.Mock

// 	const mockPrivateKey =
// 		'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex
// 	const mockAlchemyApiKey = 'test-alchemy-api-key'

// 	beforeEach(async () => {
// 		process.env.PRIVATE_KEY = mockPrivateKey
// 		process.env.ALCHEMY_API_KEY = mockAlchemyApiKey

// 		configServiceGetter = jest.fn()

// 		const module: TestingModule = await Test.createTestingModule({
// 			providers: [
// 				ChainClientConfigService,
// 				{
// 					provide: ConfigService,
// 					useValue: {
// 						get: configServiceGetter,
// 					},
// 				},
// 			],
// 		}).compile()

// 		service = module.get<ChainClientConfigService>(ChainClientConfigService)
// 	})

// 	afterEach(() => {
// 		jest.clearAllMocks()
// 		delete process.env.PRIVATE_KEY
// 		delete process.env.ALCHEMY_API_KEY
// 	})

// 	describe('rpcUrls', () => {
// 		it('should parse config and convert alchemy to url', () => {
// 			// Mock config service to return alchemy provider
// 			const mockConfig = {
// 				rpcProviders: {
// 					1: ['alchemy', 'https://eth.merkle.io'],
// 					42161: ['alchemy'],
// 					137: ['https://polygon-rpc.com'],
// 				},
// 			}
// 			configServiceGetter.mockReturnValue(mockConfig)

// 			service.onModuleInit()

// 			expect(service.rpcUrls).toEqual({
// 				'1': [
// 					'https://eth-mainnet.g.alchemy.com/v2/test-alchemy-api-key',
// 					'https://eth.merkle.io',
// 				],
// 				'42161': [
// 					'https://arb-mainnet.g.alchemy.com/v2/test-alchemy-api-key',
// 				],
// 				'137': ['https://polygon-rpc.com'],
// 			})
// 		})

// 		it('should throw error if rpcProvider is not url', () => {
// 			const mockConfig = {
// 				rpcProviders: {
// 					1: ['invalid-url'],
// 				},
// 			}
// 			configServiceGetter.mockReturnValue(mockConfig)

// 			expect(() => service.onModuleInit()).toThrow()
// 		})
// 	})

// 	describe('customChain', () => {
// 		it('should create custom chains', () => {
// 			const mockConfig = {
// 				customChains: [
// 					{
// 						chainId: 999,
// 						defaultRpcUrl: 'https://custom-chain-1.com/rpc',
// 						chainName: 'Custom Chain 1',
// 						nativeCurrency: {
// 							name: 'Custom Token 1',
// 							symbol: 'CT1',
// 							decimals: 18,
// 						},
// 					},
// 					{
// 						chainId: 1000,
// 						defaultRpcUrl: 'https://custom-chain-2.com/rpc',
// 						chainName: 'Custom Chain 2',
// 						nativeCurrency: {
// 							name: 'Custom Token 2',
// 							symbol: 'CT2',
// 							decimals: 6,
// 						},
// 					},
// 				],
// 			}
// 			configServiceGetter.mockReturnValue(mockConfig)

// 			service.onModuleInit()

// 			expect(service.customChains).toHaveLength(2)
// 			expect(service.customChains![0].id).toBe(999)
// 			expect(service.customChains![1].id).toBe(1000)
// 			expect(service.customChains![1].nativeCurrency.decimals).toBe(6)
// 		})
// 	})
// })
