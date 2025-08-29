import { Test } from '@nestjs/testing'
import fs from 'fs'
import { Logger } from 'nestjs-pino'
import { AppModule } from '../../src/app.module'
import { PoolUtils } from '../../src/core/infrastructure/dex/pool-utils'
import { ChainClientService } from '../../src/core/infrastructure/evm/chain-client/chain-client.service'
import { wait } from '../../src/utils/common'
import { setTokenBalance, useAnvil } from '../testUtils/anvil'

process.env.BOT_CONFIG_PATH = 'test/e2e/bot-config.yaml'

const wethUsdcPoolAddress = '0xC6962004f452bE9203591991D15f6b388e09E8D0'

describe('E2E', () => {
	const { mockChainClientService, anvil } = useAnvil({ chainId: 42161 })

	it('should find and execute opportunity', async () => {
		const walletClient = mockChainClientService.getWalletClient(42161)

		const testAppModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(ChainClientService)
			.useValue(mockChainClientService)
			.compile()

		testAppModule.useLogger(testAppModule.get(Logger))

		const poolUtils = testAppModule.get(PoolUtils)

		const pool = await poolUtils.createPool(
			wethUsdcPoolAddress,
			42161,
			'UNI_V3',
		)

		const usdc = pool.token1

		await setTokenBalance(
			walletClient.account.address,
			usdc.address,
			usdc.parseUnits('5000000'),
			mockChainClientService.getClient(42161),
		)

		await pool.approveInfinite()

		const { waitForResult } = await pool.swap({
			tokenIn: usdc,
			tokenOut: pool.token0,
			amountIn: usdc.parseUnits('4000000'),
		})
		await waitForResult()

		await testAppModule.init()

		setInterval(() => {
			fs.writeFile('anvil.log', anvil.logs, () => {})
		}, 5000)

		await wait(10 * 60 * 1000)
	})
})
