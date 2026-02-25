import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { base } from 'viem/chains'
import { ChainClientService } from '../../src/core/infrastructure/evm/chain-client/chain-client.service'
import { Token } from '../../src/core/infrastructure/evm/primitives/tokens/Token'
import { TokenUtils } from '../../src/core/infrastructure/evm/primitives/tokens/TokenUtils'
import { LifiModule } from '../../src/core/infrastructure/lifi/lifi.module'
import { LifiService } from '../../src/core/infrastructure/lifi/lifi.service'
import { SuccessSwapResult } from '../../src/core/infrastructure/lifi/types'
import { setTokenBalance, useAnvil } from '../testUtils/anvil'

const imoAddress = '0x5A7a2bf9fFae199f088B25837DcD7E115CF8E1bb'
const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

describe('lifi', () => {
	const { anvils, mockChainClientService } = useAnvil({
		chainId: base.id,
		printTraces: true,
	})
	const anvil = anvils[0]

	it('should swap', async () => {
		const testAppModule = await Test.createTestingModule({
			imports: [LifiModule, ConfigModule.forRoot({ isGlobal: true })],
		})
			.overrideProvider(ChainClientService)
			.useValue(mockChainClientService)
			.compile()

		const tokenUtils = testAppModule.get(TokenUtils)
		const lifiService = testAppModule.get(LifiService)

		const imo = await tokenUtils.fromAddress(imoAddress, base.id)
		const usdc = await tokenUtils.fromAddress(usdcAddress, base.id)

		const tokenIn = usdc
		const tokenOut = imo
		const amountIn = tokenIn.parseUnits('1')

		const { rawQuote } = await lifiService.quote({
			tokenIn,
			tokenOut,
			amountIn,
		})

		await (tokenIn as Token).approve(
			rawQuote.estimate.approvalAddress as Address,
			amountIn,
		)

		const botAddress = mockChainClientService.getWalletClient(
			tokenIn.chainId,
		).account.address

		await setTokenBalance(
			botAddress,
			tokenIn.address,
			amountIn,
			mockChainClientService.getClient(tokenIn.chainId),
		)

		const tokenInBalanceBefore = await tokenIn.balanceOf(botAddress)
		const tokenOutBalanceBefore = await tokenOut.balanceOf(botAddress)

		try {
			const { waitForResult } = await lifiService.swap({
				tokenIn,
				tokenOut,
				amountIn,
			})
			const swapRes = await waitForResult()

			expect(swapRes.status).toBe('success')

			const tokenInBalanceAfter = await tokenIn.balanceOf(botAddress)
			const tokenOutBalanceAfter = await tokenOut.balanceOf(botAddress)

			expect((swapRes as SuccessSwapResult).amountOut).toBe(
				tokenOutBalanceAfter - tokenOutBalanceBefore,
			)
			expect(amountIn).toBe(tokenInBalanceBefore - tokenInBalanceAfter)
		} catch (error) {
			anvil.logFromLastEthCall()

			throw error
		}
	})
})
