import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import {
	Chain,
	Client,
	ContractFunctionExecutionError,
	erc20Abi,
	getContract,
	WalletClient,
} from 'viem'
import { ChainClientService } from '../../src/chain-client/chain-client.service'
import { Pool } from '../../src/dex/base/Pool'
import { DexRegistry } from '../../src/dex/DexRegistry'
import { PoolType } from '../../src/dex/PoolUtils'
import { GeckoTerminalService } from '../../src/modules/price-oracle/gecko-terminal.service'
import { PriceOracleService } from '../../src/modules/price-oracle/price-oracle.service'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { setNativeBalance, setTokenBalance, useAnvil } from '../testUtils/anvil'

export type PoolTestConfig = {
	chain: Chain
	poolType: PoolType
	poolAddress: Address
	/** anvil will use rpcUrl for fork or, if not provided, the default rpc url from viem */
	rpcUrl?: string
	/**
	 * Assert pool creation by checking the tokens in the pool
	 * If not provided, the pool creation will not be asserted
	 */
	assertPoolCreation?: {
		token0Address: Address
		token1Address: Address
	}
}

export function testPool(context: PoolTestConfig) {
	const { chain, poolAddress, rpcUrl, poolType, assertPoolCreation } = context

	const AMOUNT_IN_USD = 1000

	let client: Client
	let walletClient: WalletClient
	let botAddress: Address
	let pool: Pool
	let priceOracleService: PriceOracleService

	const { mockChainClientService, anvil } = useAnvil({
		chainId: chain.id,
		timeoutStartAnvil: 20000,
		rpcUrl,
	})

	beforeAll(async () => {
		const poolCreatorClass = DexRegistry[poolType]
		const app = await Test.createTestingModule({
			providers: [
				{
					provide: ChainClientService,
					useValue: mockChainClientService,
				},
				TokenUtils,
				poolCreatorClass,
				PriceOracleService,
				GeckoTerminalService,
				Logger,
			],
		}).compile()

		walletClient = mockChainClientService.getWalletClient(chain.id)
		botAddress = walletClient.account!.address
		priceOracleService = app.get(PriceOracleService)

		client = mockChainClientService.getClient(chain.id)

		const poolCreator = app.get(poolCreatorClass)

		pool = await poolCreator.create(poolAddress, chain.id)

		await setNativeBalance(client, botAddress, 10n ** 36n)
		await setTokenBalance(
			botAddress,
			pool.token0.address,
			10n ** 36n,
			client,
		)
		await setTokenBalance(
			botAddress,
			pool.token1.address,
			10n ** 36n,
			client,
		)
	})

	it('should quote, simulate and swap token0 to token1', async () => {
		await swapAndAssert(pool.token0, pool.token1)
	})

	it('should quote, simulate and swap token1 to token0', async () => {
		await swapAndAssert(pool.token1, pool.token0)
	})

	if (assertPoolCreation) {
		it('pool token0 should be expected token0', () => {
			assertAddresses(
				pool.token0.address,
				assertPoolCreation.token0Address,
			)
		})

		it('pool token1 should be expected token1', () => {
			assertAddresses(
				pool.token1.address,
				assertPoolCreation.token1Address,
			)
		})
	}

	function assertAddresses(received: Address, expected: Address) {
		expect(received.toLowerCase()).toBe(expected.toLowerCase())
	}

	async function swapAndAssert(tokenIn: Token, tokenOut: Token) {
		try {
			const tokenInPrice = await priceOracleService.getPrice(tokenIn)
			const tokenOutPrice = await priceOracleService.getPrice(tokenOut)

			const amountIn = tokenIn.parseUnits(
				(AMOUNT_IN_USD / tokenInPrice).toString(),
			)

			const tokenInContract = getContract({
				address: tokenIn.address,
				abi: erc20Abi,
				client: walletClient,
			})

			const tokenOutContract = getContract({
				address: tokenOut.address,
				abi: erc20Abi,
				client: walletClient,
			})

			await tokenInContract.write.approve(
				[pool.routerAddress, amountIn],
				{
					account: walletClient.account!,
					chain: walletClient.chain,
				},
			)

			const tokenInBalanceBefore = await tokenInContract.read.balanceOf([
				botAddress,
			])

			const tokenOutBalanceBefore = await tokenOutContract.read.balanceOf(
				[botAddress],
			)

			const { amountOut: amountOutQuote } = await pool.quoteSwap({
				tokenIn,
				tokenOut,
				amountIn,
			})

			const { amountOut: amountOutSimulated } = await pool.simulateSwap({
				tokenIn,
				tokenOut,
				amountIn,
			})

			const { amountOut } = await pool.swap({
				tokenIn,
				tokenOut,
				amountIn,
			})

			const tokenInBalanceAfter = await tokenInContract.read.balanceOf([
				botAddress,
			])
			const tokenOutBalanceAfter = await tokenOutContract.read.balanceOf([
				botAddress,
			])

			// simulate, quote and swap return the same amount
			expect(amountOut).toBe(amountOutSimulated)
			expect(amountOut).toBe(amountOutQuote)

			// swap truly happens
			expect(tokenInBalanceBefore - tokenInBalanceAfter).toBe(amountIn)
			expect(tokenOutBalanceAfter - tokenOutBalanceBefore).toBe(amountOut)

			const amountOutUsd =
				Number(tokenOut.formatUnits(amountOut)) * tokenOutPrice

			// swap makes sense and we receive suitable value
			expect(amountOutUsd).toBeGreaterThan(AMOUNT_IN_USD / 2)
		} catch (err) {
			if (err instanceof ContractFunctionExecutionError) {
				const shortenedError = new ContractFunctionExecutionError(
					err.cause,
					{
						...err,
						abi: [],
					},
				)
				console.log('error', shortenedError)
			} else {
				console.log('error', err)
			}

			const lastEthCallIdx = anvil.logs.lastIndexOf('eth_call')

			if (lastEthCallIdx !== -1) {
				console.log(
					`last eth_call: ${anvil.logs.slice(lastEthCallIdx)}`,
				)
			} else {
				console.log('No eth_call found in logs')
			}

			throw err
		}
	}
}
