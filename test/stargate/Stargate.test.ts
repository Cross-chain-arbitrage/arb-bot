import { ConfigModule } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { arbitrum, fuse } from 'viem/chains'
import { ChainClientService } from '../../src/core/infrastructure/evm/chain-client/chain-client.service'
import { NativeCurrency } from '../../src/core/infrastructure/evm/primitives/tokens/NativeCurrency'
import { Token } from '../../src/core/infrastructure/evm/primitives/tokens/Token'
import { TokenUtils } from '../../src/core/infrastructure/evm/primitives/tokens/TokenUtils'
import { LayerZeroScanService } from '../../src/core/infrastructure/layerzero-bridges/layerzero-scan/layerzero-scan.service'
import { StargateAPIService } from '../../src/core/infrastructure/layerzero-bridges/stargate/stargate-api.service'
import { StargateService } from '../../src/core/infrastructure/layerzero-bridges/stargate/stargate-service'
import { StargateBridgeTx } from '../../src/core/infrastructure/layerzero-bridges/stargate/stargate-tx'
import { setNativeBalance, setTokenBalance, useAnvil } from '../testUtils/anvil'

describe('Stargate', () => {
	describe('Arbitrum One', () => {
		let stargateService: StargateService
		let tokenUtils: TokenUtils
		let chainClientService: ChainClientService

		const { anvils, mockChainClientService } = useAnvil({
			chainId: arbitrum.id,
			printTraces: true,
		})
		const anvil = anvils[0]

		beforeAll(async () => {
			const module: TestingModule = await Test.createTestingModule({
				imports: [ConfigModule.forRoot({ isGlobal: true })],
				providers: [
					StargateService,
					StargateAPIService,
					TokenUtils,
					LayerZeroScanService,
					{
						provide: ChainClientService,
						useValue: mockChainClientService,
					},
				],
			}).compile()

			stargateService = module.get<StargateService>(StargateService)
			tokenUtils = module.get<TokenUtils>(TokenUtils)
			chainClientService = module.get<ChainClientService>(ChainClientService)
		})

		it('MUST simulate sending Token', async () => {
			const USDT = await tokenUtils.fromAddress(
				'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
				arbitrum.id,
			)

			const amount = USDT.parseUnits('1')
			const wallet = chainClientService.getWalletClient(arbitrum.id)
			const recipient = wallet.account.address

			await setTokenBalance(
				recipient,
				USDT.address,
				amount,
				chainClientService.getClient(arbitrum.id),
			)

			const bridgeAddr = await stargateService.getBridgeAddress(USDT)

			if (USDT instanceof Token) {
				await USDT.approve(bridgeAddr, amount)
			}

			const tokenOut = await tokenUtils.fromAddress(
				'0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7', // USDT on Fuse
				fuse.id,
			)

			const result = await stargateService.bridge(
				USDT,
				tokenOut,
				amount,
				true, // simulateOnly
			)

			expect(result).toBeDefined()
			expect(result.bridgeTx).toBeInstanceOf(StargateBridgeTx)
			expect(result.amountOut).toBeGreaterThan(0n)
		})

		it('MUST simulate sending Native', async () => {
			const ETH = tokenUtils.getNative(arbitrum.id)
			const amount = ETH.parseUnits('0.01')

			const wallet = chainClientService.getWalletClient(arbitrum.id)
			const recipient = wallet.account.address

			await setNativeBalance(
				chainClientService.getClient(arbitrum.id),
				recipient,
				amount * 2n,
			)

			const tokenOut = tokenUtils.getNative(fuse.id)

			const result = await stargateService.bridge(
				ETH,
				tokenOut,
				amount,
				true, // simulateOnly
			)

			expect(result).toBeDefined()
			expect(result.bridgeTx).toBeInstanceOf(StargateBridgeTx)
		})

		describe('quoteBridge()', () => {
			it('MUST return quote for USDT', async () => {
				const USDT = await tokenUtils.fromAddress(
					'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
					arbitrum.id,
				)

				const amount = USDT.parseUnits('1')

				const { amountOut, tokenOut, quote } =
					await stargateService.quoteBridge(USDT, amount, fuse.id)

				expect(tokenOut.address).toBe(
					'0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7',
				)
				expect(tokenOut.chainId).toBe(fuse.id)
				expect(amountOut).toBe(amount)

				expect(quote).toBeDefined()
				expect(quote.messagingFee.nativeFee).toBeGreaterThan(0n)
			})

			it('MUST calculate exact quote for ETH bridge', async () => {
				// Real life example:
				// https://layerzeroscan.com/tx/0x758ac28e912dff96b8ad5e27a631b23e28861757d09b384d515f64f9fd59bf87
				const ETH = tokenUtils.getNative(arbitrum.id)

				const amount = 199559617334342520n
				const realAmountOut = 199559000000000000n

				const { amountOut: calculatedAmountOut } =
					await stargateService.quoteBridge(ETH, amount, fuse.id)

				expect(calculatedAmountOut).toBe(realAmountOut)
			})
		})
	})
})
