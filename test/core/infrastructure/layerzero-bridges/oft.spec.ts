import { ConfigModule } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { base } from 'viem/chains'
import { ChainClientService } from '../../../../src/core/infrastructure/evm/chain-client/chain-client.service'
import { EvmModule } from '../../../../src/core/infrastructure/evm/evm.module'
import { NativeCurrency } from '../../../../src/core/infrastructure/evm/primitives/tokens/NativeCurrency'
import { Token } from '../../../../src/core/infrastructure/evm/primitives/tokens/Token'
import { TokenUtils } from '../../../../src/core/infrastructure/evm/primitives/tokens/TokenUtils'
import { LayerZeroScanModule } from '../../../../src/core/infrastructure/layerzero-bridges/layerzero-scan/layerzero-scan.module'
import { OftService } from '../../../../src/core/infrastructure/layerzero-bridges/oft/oft.service'
import { setTokenBalance, useAnvil } from '../../../testUtils/anvil'

const glueChainId = 1300
const baseChainId = base.id

describe('oft service', () => {
	const toshiOnBaseAddress = '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4'
	const toshiOnGlueAddress = '0x33bAC01fdD0648769F5f941C692621D61D6D31b9'
	const glueOnBaseAddress = '0x840B20fA3D48Ac709fD841fcd878c3E8aaBd7087'

	let toshiOnBase: Token
	let toshiOnGlue: Token
	let glueOnGlue: NativeCurrency
	let glueOnBase: Token

	let appModule: TestingModule

	const { mockChainClientService } = useAnvil([
		{ chainId: glueChainId, rpcUrl: 'https://rpc.glue.net' },
		{ chainId: baseChainId },
	])

	beforeAll(async () => {
		appModule = await Test.createTestingModule({
			imports: [
				EvmModule,
				LayerZeroScanModule,
				ConfigModule.forRoot({ isGlobal: true }),
			],
			providers: [OftService],
		})
			.overrideProvider(ChainClientService)
			.useValue(mockChainClientService)
			.compile()

		const tokenUtils = appModule.get(TokenUtils)

		toshiOnBase = await tokenUtils.fromAddress(
			toshiOnBaseAddress,
			baseChainId,
		)

		toshiOnGlue = await tokenUtils.fromAddress(
			toshiOnGlueAddress,
			glueChainId,
		)

		glueOnGlue = tokenUtils.getNative(glueChainId)

		glueOnBase = await tokenUtils.fromAddress(
			glueOnBaseAddress,
			baseChainId,
		)
	})

	it('should bridge non-oft token through oft-adapter', async () => {
		const amount = toshiOnBase.parseUnits('1.111111111')

		const baseWalletClient =
			mockChainClientService.getWalletClient(baseChainId)
		const baseClient = mockChainClientService.getClient(baseChainId)

		await setTokenBalance(
			baseWalletClient.account.address,
			toshiOnBase.address,
			amount,
			baseClient,
		)

		const oftService = appModule.get(OftService)

		await oftService.approveInfinite(toshiOnBase)

		const bridgeRes = await oftService.bridge(
			toshiOnBase,
			toshiOnGlue,
			amount,
		)

		const receipt = await baseClient.waitForTransactionReceipt({
			hash: bridgeRes.bridgeTx.srcTx.hash,
		})

		expect(receipt.status).toBe('success')
		expect(bridgeRes.amountOut).toBe(toshiOnGlue.parseUnits('1.111111'))
	})

	it('should bridge oft', async () => {
		const amount = toshiOnGlue.parseUnits('1.111111111')

		const glueWalletClient =
			mockChainClientService.getWalletClient(glueChainId)
		const glueClient = mockChainClientService.getClient(glueChainId)

		await setTokenBalance(
			glueWalletClient.account.address,
			toshiOnGlue.address,
			amount,
			glueClient,
		)

		const oftService = appModule.get(OftService)

		await oftService.approveInfinite(toshiOnGlue)

		const bridgeRes = await oftService.bridge(
			toshiOnGlue,
			toshiOnBase,
			amount,
		)

		const receipt = await glueClient.waitForTransactionReceipt({
			hash: bridgeRes.bridgeTx.srcTx.hash,
		})

		expect(receipt.status).toBe('success')
		expect(bridgeRes.amountOut).toBe(toshiOnBase.parseUnits('1.111111'))
	})

	it('should bridge native', async () => {
		const amount = glueOnGlue.parseUnits('1.111111111')

		const glueWalletClient =
			mockChainClientService.getWalletClient(glueChainId)
		const glueClient = mockChainClientService.getClient(glueChainId)

		const oftService = appModule.get(OftService)

		const bridgeRes = await oftService.bridge(
			glueOnGlue,
			glueOnBase,
			amount,
		)

		const receipt = await glueClient.waitForTransactionReceipt({
			hash: bridgeRes.bridgeTx.srcTx.hash,
		})

		expect(receipt.status).toBe('success')
	})
})
