import { ConfigModule } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import {
	Chain,
	createWalletClient,
	erc20Abi,
	http,
	PublicClient,
	Transport,
	WalletClient,
} from 'viem'
import { LocalAccount, privateKeyToAccount } from 'viem/accounts'
import { ChainClientService } from '../../../../src/core/infrastructure/evm/chain-client/chain-client.service'
import { EvmHelper } from '../../../../src/core/infrastructure/evm/evm-helper'
import { EvmModule } from '../../../../src/core/infrastructure/evm/evm.module'
import { NativeCurrency } from '../../../../src/core/infrastructure/evm/primitives/tokens/NativeCurrency'
import { Token } from '../../../../src/core/infrastructure/evm/primitives/tokens/Token'
import { TokenUtils } from '../../../../src/core/infrastructure/evm/primitives/tokens/TokenUtils'
import { setTokenBalance, useAnvil } from '../../../testUtils/anvil'

const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
const chainId = 42161

const thirdPartyPk =
	'0xbc103f0a89e25aea9469dbb412d6f7bf08c2c64f795c6c9621e498bdc5fbf3f2'

describe('EvmHelpers', () => {
	const { mockChainClientService, anvils } = useAnvil({ chainId })

	describe('parseBalanceChange', () => {
		let testAppModule: TestingModule

		let usdc: Token
		let native: NativeCurrency

		let thirdPartyWalletClient: WalletClient<
			Transport,
			Chain,
			LocalAccount,
			undefined
		>
		let walletClient: WalletClient<
			Transport,
			Chain,
			LocalAccount,
			undefined
		>
		let client: PublicClient

		let evmHelper: EvmHelper

		beforeAll(async () => {
			testAppModule = await Test.createTestingModule({
				imports: [EvmModule, ConfigModule.forRoot({ isGlobal: true })],
			})
				.overrideProvider(ChainClientService)
				.useValue(mockChainClientService)
				.compile()

			const tokenUtils = testAppModule.get(TokenUtils)
			evmHelper = testAppModule.get(EvmHelper)

			walletClient = mockChainClientService.getWalletClient(chainId)
			client = mockChainClientService.getClient(chainId)

			thirdPartyWalletClient = createWalletClient({
				transport: http(`http://localhost:${anvils[0].port}`),
				account: privateKeyToAccount(thirdPartyPk),
			})

			usdc = await tokenUtils.fromAddress(usdcAddress, chainId)
			native = tokenUtils.getNative(chainId)

			await setTokenBalance(
				walletClient.account.address,
				usdc.address,
				usdc.parseUnits('500000'),
				client,
			)
			await setTokenBalance(
				thirdPartyWalletClient.account.address,
				usdc.address,
				usdc.parseUnits('500000'),
				client,
			)
		})

		it('should be the right change while receiving tokens', async () => {
			const amount = 1_000_000n

			const txHash = await thirdPartyWalletClient.writeContract({
				abi: erc20Abi,
				address: usdc.address,
				functionName: 'transfer',
				args: [walletClient.account.address, amount],
			})

			const txReceipt = await client.waitForTransactionReceipt({
				hash: txHash,
			})

			const balanceChange = await evmHelper.parseBalanceChange(
				usdc,
				txReceipt,
			)

			expect(balanceChange).toBe(amount)
		})

		it('should be the right change while sending tokens', async () => {
			const amount = 1_000_000n

			const txHash = await walletClient.writeContract({
				abi: erc20Abi,
				address: usdc.address,
				functionName: 'transfer',
				args: [thirdPartyWalletClient.account.address, amount],
			})

			const txReceipt = await client.waitForTransactionReceipt({
				hash: txHash,
			})

			const balanceChange = await evmHelper.parseBalanceChange(
				usdc,
				txReceipt,
			)

			expect(balanceChange).toBe(-amount)
		})

		it('should be the right change while sending native', async () => {
			const amount = 1_000_000n

			const txHash = await walletClient.sendTransaction({
				to: thirdPartyWalletClient.account.address,
				value: amount,
			})

			const txReceipt = await client.waitForTransactionReceipt({
				hash: txHash,
			})

			const balanceChange = await evmHelper.parseBalanceChange(
				native,
				txReceipt,
			)

			expect(balanceChange).toBe(
				-amount - txReceipt.effectiveGasPrice * txReceipt.gasUsed,
			)
		})

		it('should be the right change while receiving native', async () => {
			const amount = 1_000_000n

			const txHash = await thirdPartyWalletClient.sendTransaction({
				to: walletClient.account.address,
				value: amount,
			})

			const txReceipt = await client.waitForTransactionReceipt({
				hash: txHash,
			})

			const balanceChange = await evmHelper.parseBalanceChange(
				native,
				txReceipt,
			)

			expect(balanceChange).toBe(amount)
		})
	})
})
