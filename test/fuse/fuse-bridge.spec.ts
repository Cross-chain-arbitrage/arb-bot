import { ConfigModule } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { arbitrum, bsc, fuse, mainnet } from 'viem/chains'
import { getAlchemyRpcUrl } from '../../src/core/infrastructure/evm/chain-client/alchemy-utils'
import { ChainClientService } from '../../src/core/infrastructure/evm/chain-client/chain-client.service'
import { EvmModule } from '../../src/core/infrastructure/evm/evm.module'
import { TokenUtils } from '../../src/core/infrastructure/evm/primitives/tokens/TokenUtils'
import { FuseBridgeService } from '../../src/core/infrastructure/layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { LayerZeroScanModule } from '../../src/core/infrastructure/layerzero-bridges/layerzero-scan/layerzero-scan.module'
import { setTokenBalance, useAnvil } from '../testUtils/anvil'

describe('FuseBridge', () => {
	const WBTC_ARB_ADDRESS = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f'
	const WBTC_FUSE_ADDRESS = '0x34009565bfeefded0f7e774629a745636bf35e82'

	describe('Fuse Chain', () => {
		let appModule: TestingModule
		let fuseBridgeService: FuseBridgeService
		let tokenUtils: TokenUtils

		const { mockChainClientService } = useAnvil([
			{ chainId: fuse.id },
			{ chainId: arbitrum.id, rpcUrl: getAlchemyRpcUrl(arbitrum.id) },
		])

		beforeAll(async () => {
			appModule = await Test.createTestingModule({
				imports: [
					EvmModule,
					LayerZeroScanModule,
					ConfigModule.forRoot({ isGlobal: true }),
				],
				providers: [FuseBridgeService],
			})
				.overrideProvider(ChainClientService)
				.useValue(mockChainClientService)
				.compile()

			fuseBridgeService = appModule.get(FuseBridgeService)
			tokenUtils = appModule.get(TokenUtils)
		})

		it('MUST quote bridge fees from Fuse to Arbitrum', async () => {
			const WBTC = await tokenUtils.fromAddress(
				WBTC_FUSE_ADDRESS,
				fuse.id,
			)

			const WBTC_ARB = await tokenUtils.fromAddress(
				WBTC_ARB_ADDRESS,
				arbitrum.id,
			)

			const amountIn = WBTC.parseUnits('1')

			const result = await fuseBridgeService.quoteBridge(
				WBTC,
				WBTC_ARB,
				amountIn,
			)

			expect(result.quote.nativeFee).toBeGreaterThan(0n)
			expect(result.quote.zroFee).toBeGreaterThanOrEqual(0n)
			expect(result.amountOut).toBeGreaterThanOrEqual(0n)
		})

		it('should bridge WBTC from Fuse to Arbitrum', async () => {
			const WBTC = await tokenUtils.fromAddress(
				WBTC_FUSE_ADDRESS,
				fuse.id,
			)

			const WBTC_ARB = await tokenUtils.fromAddress(
				WBTC_ARB_ADDRESS,
				arbitrum.id,
			)

			const amount = WBTC.parseUnits('0.00000001')

			const walletClient = mockChainClientService.getWalletClient(fuse.id)
			const client = mockChainClientService.getClient(fuse.id)

			await setTokenBalance(
				walletClient.account.address,
				WBTC_FUSE_ADDRESS,
				amount,
				client,
			)

			await fuseBridgeService.approveToBridge(WBTC, amount, arbitrum.id)

			const result = await fuseBridgeService.bridge(
				WBTC,
				WBTC_ARB,
				amount,
			)

			const receipt = await client.waitForTransactionReceipt({
				hash: result.bridgeTx.hash,
			})

			expect(receipt.status).toBe('success')
			expect(result.bridgeTx.hash).toBeDefined()
			expect(result.bridgeTx.chainId).toBe(WBTC.chainId)
		})
	})

	describe('Arbitrum Chain', () => {
		let appModule: TestingModule
		let fuseBridgeService: FuseBridgeService
		let tokenUtils: TokenUtils

		const { mockChainClientService } = useAnvil([
			{ chainId: arbitrum.id, rpcUrl: getAlchemyRpcUrl(arbitrum.id) },
			{ chainId: fuse.id },
		])

		beforeAll(async () => {
			appModule = await Test.createTestingModule({
				imports: [
					EvmModule,
					LayerZeroScanModule,
					ConfigModule.forRoot({ isGlobal: true }),
				],
				providers: [FuseBridgeService],
			})
				.overrideProvider(ChainClientService)
				.useValue(mockChainClientService)
				.compile()

			fuseBridgeService = appModule.get(FuseBridgeService)
			tokenUtils = appModule.get(TokenUtils)
		})

		it('MUST quote bridge fees from Arbitrum to Fuse', async () => {
			const WBTC = await tokenUtils.fromAddress(
				WBTC_ARB_ADDRESS,
				arbitrum.id,
			)

			const WBTC_FUSE = await tokenUtils.fromAddress(
				WBTC_FUSE_ADDRESS,
				fuse.id,
			)

			const amountIn = WBTC.parseUnits('1')

			const result = await fuseBridgeService.quoteBridge(
				WBTC,
				WBTC_FUSE,
				amountIn,
			)

			expect(result.quote.nativeFee).toBeGreaterThan(0n)
			expect(result.quote.zroFee).toBeGreaterThanOrEqual(0n)
			expect(result.amountOut).toBeGreaterThanOrEqual(0n)
		})

		it('MUST bridge WBTC from Arbitrum to Fuse', async () => {
			const WBTC = await tokenUtils.fromAddress(
				WBTC_ARB_ADDRESS,
				arbitrum.id,
			)

			const WBTC_FUSE = await tokenUtils.fromAddress(
				WBTC_FUSE_ADDRESS,
				fuse.id,
			)

			const amount = WBTC.parseUnits('1')

			const walletClient =
				mockChainClientService.getWalletClient(arbitrum.id)
			const client = mockChainClientService.getClient(arbitrum.id)

			await setTokenBalance(
				walletClient.account.address,
				WBTC_ARB_ADDRESS,
				amount,
				client,
			)

			await fuseBridgeService.approveToBridge(WBTC, amount, fuse.id)

			const result = await fuseBridgeService.bridge(
				WBTC,
				WBTC_FUSE,
				amount,
			)

			const receipt = await client.waitForTransactionReceipt({
				hash: result.bridgeTx.hash,
			})

			expect(receipt.status).toBe('success')
			expect(result.bridgeTx.hash).toBeDefined()
			expect(result.bridgeTx.chainId).toBe(WBTC.chainId)
		})
	})

	describe('Bridging Fuse Token', () => {
		describe('From Fuse Chain', () => {
			let appModule: TestingModule
			let fuseBridgeService: FuseBridgeService
			let tokenUtils: TokenUtils

			const { mockChainClientService } = useAnvil([
				{ chainId: fuse.id },
				{ chainId: bsc.id, rpcUrl: getAlchemyRpcUrl(bsc.id) },
				{ chainId: mainnet.id, rpcUrl: getAlchemyRpcUrl(mainnet.id) },
			])

			beforeAll(async () => {
				appModule = await Test.createTestingModule({
					imports: [
						EvmModule,
						LayerZeroScanModule,
						ConfigModule.forRoot({ isGlobal: true }),
					],
					providers: [FuseBridgeService],
				})
					.overrideProvider(ChainClientService)
					.useValue(mockChainClientService)
					.compile()

				fuseBridgeService = appModule.get(FuseBridgeService)
				tokenUtils = appModule.get(TokenUtils)
			})

			it('MUST bridge FUSE to BSC', async () => {
				const FUSE = tokenUtils.getNative(fuse.id)
				const FUSE_BSC = await tokenUtils.fromAddress(
					'0x5857c96dae9cf8511b08cb07f85753c472d36ea3',
					bsc.id,
				)

				const client = mockChainClientService.getClient(fuse.id)

				const result = await fuseBridgeService.bridge(
					FUSE,
					FUSE_BSC,
					FUSE.parseUnits('100'),
				)

				const receipt = await client.waitForTransactionReceipt({
					hash: result.bridgeTx.hash,
				})

				expect(receipt.status).toBe('success')
			})

			it('MUST bridge FUSE to Ethereum', async () => {
				const FUSE = tokenUtils.getNative(fuse.id)
				const FUSE_ETH = await tokenUtils.fromAddress(
					'0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d',
					mainnet.id,
				)

				const client = mockChainClientService.getClient(fuse.id)

				const result = await fuseBridgeService.bridge(
					FUSE,
					FUSE_ETH,
					FUSE.parseUnits('100'),
				)

				const receipt = await client.waitForTransactionReceipt({
					hash: result.bridgeTx.hash,
				})

				expect(receipt.status).toBe('success')
			})
		})

		describe('From Ethereum Chain', () => {
			let appModule: TestingModule
			let fuseBridgeService: FuseBridgeService
			let tokenUtils: TokenUtils

			const { mockChainClientService } = useAnvil([
				{ chainId: mainnet.id, rpcUrl: getAlchemyRpcUrl(mainnet.id) },
				{ chainId: fuse.id },
			])

			beforeAll(async () => {
				appModule = await Test.createTestingModule({
					imports: [
						EvmModule,
						LayerZeroScanModule,
						ConfigModule.forRoot({ isGlobal: true }),
					],
					providers: [FuseBridgeService],
				})
					.overrideProvider(ChainClientService)
					.useValue(mockChainClientService)
					.compile()

				fuseBridgeService = appModule.get(FuseBridgeService)
				tokenUtils = appModule.get(TokenUtils)
			})

			it('MUST bridge FUSE', async () => {
				const walletClient =
					mockChainClientService.getWalletClient(mainnet.id)
				const client = mockChainClientService.getClient(mainnet.id)

				const FUSE_ETH = await tokenUtils.fromAddress(
					'0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d',
					mainnet.id,
				)

				const FUSE_FUSE = tokenUtils.getNative(fuse.id)

				const amount = FUSE_ETH.parseUnits('100')

				await setTokenBalance(
					walletClient.account.address,
					FUSE_ETH.address,
					amount,
					client,
				)

				await fuseBridgeService.approveToBridge(FUSE_ETH, amount, fuse.id)

				const result = await fuseBridgeService.bridge(
					FUSE_ETH,
					FUSE_FUSE,
					amount,
				)

				const receipt = await client.waitForTransactionReceipt({
					hash: result.bridgeTx.hash,
				})

				expect(receipt.status).toBe('success')
			})
		})

		describe('From BSC Chain', () => {
			let appModule: TestingModule
			let fuseBridgeService: FuseBridgeService
			let tokenUtils: TokenUtils

			const { mockChainClientService } = useAnvil([
				{ chainId: bsc.id, rpcUrl: getAlchemyRpcUrl(bsc.id) },
				{ chainId: fuse.id },
			])

			beforeAll(async () => {
				appModule = await Test.createTestingModule({
					imports: [
						EvmModule,
						LayerZeroScanModule,
						ConfigModule.forRoot({ isGlobal: true }),
					],
					providers: [FuseBridgeService],
				})
					.overrideProvider(ChainClientService)
					.useValue(mockChainClientService)
					.compile()

				fuseBridgeService = appModule.get(FuseBridgeService)
				tokenUtils = appModule.get(TokenUtils)
			})

			it('MUST bridge FUSE', async () => {
				const walletClient = mockChainClientService.getWalletClient(bsc.id)
				const client = mockChainClientService.getClient(bsc.id)

				const FUSE_BSC = await tokenUtils.fromAddress(
					'0x5857c96dae9cf8511b08cb07f85753c472d36ea3',
					bsc.id,
				)

				const FUSE_FUSE = tokenUtils.getNative(fuse.id)

				const amount = FUSE_BSC.parseUnits('100')

				await setTokenBalance(
					walletClient.account.address,
					FUSE_BSC.address,
					amount,
					client,
				)

				await fuseBridgeService.approveToBridge(FUSE_BSC, amount, fuse.id)

				const result = await fuseBridgeService.bridge(
					FUSE_BSC,
					FUSE_FUSE,
					amount,
				)

				const receipt = await client.waitForTransactionReceipt({
					hash: result.bridgeTx.hash,
				})

				expect(receipt.status).toBe('success')
			})
		})
	})
})
