import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import {
	Client,
	ContractFunctionExecutionError,
	erc20Abi,
	getContract,
	WalletClient,
} from 'viem'
import { Pool } from '../../src/core/infrastructure/dex/base/pool'
import { DexModule } from '../../src/core/infrastructure/dex/dex.module'
import {
	PoolType,
	PoolUtils,
} from '../../src/core/infrastructure/dex/pool-utils'
import { ChainClientService } from '../../src/core/infrastructure/evm/chain-client/chain-client.service'
import { Token } from '../../src/core/infrastructure/evm/primitives/tokens/Token'
import { PriceOracleModule } from '../../src/core/infrastructure/price-oracle/price-oracle.module'
import { PriceOracleService } from '../../src/core/infrastructure/price-oracle/price-oracle.service'
import { setNativeBalance, setTokenBalance, useAnvil } from './anvil'

export type PoolTestConfig = {
	chainId: number
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
	const { chainId, poolAddress, rpcUrl, poolType, assertPoolCreation } =
		context

	const AMOUNT_IN_USD = 1000

	let client: Client
	let walletClient: WalletClient
	let botAddress: Address
	let pool: Pool
	let priceOracleService: PriceOracleService

	const { mockChainClientService, anvils } = useAnvil({
		chainId,
		timeoutStartAnvil: 20000,
		rpcUrl,
	})

	beforeAll(async () => {
		const app = await Test.createTestingModule({
			imports: [
				DexModule,
				ConfigModule.forRoot({ isGlobal: true }),
				PriceOracleModule,
			],
		})
			.overrideProvider(ChainClientService)
			.useValue(mockChainClientService)
			.compile()

		walletClient = mockChainClientService.getWalletClient(chainId)
		botAddress = walletClient.account!.address
		priceOracleService = app.get(PriceOracleService)

		client = mockChainClientService.getClient(chainId)

		const poolUtils = app.get(PoolUtils)

		pool = await poolUtils.createPool(poolAddress, chainId, poolType)

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

		await pool.approveInfinite()
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
			const { tokenInPrice, tokenOutPrice } = await getTokenPrices(
				tokenIn,
				tokenOut,
			)

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

			const { waitForResult } = await pool.swap({
				tokenIn,
				tokenOut,
				amountIn,
			})

			const result = await waitForResult()

			if (result.status === 'reverted') {
				throw new Error('Swap reverted')
			}

			const { amountOut } = result

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

			const lastEthCallIdx = anvils[0].logs.lastIndexOf('eth_call')

			if (lastEthCallIdx !== -1) {
				console.log(
					`last eth_call: ${anvils[0].logs.slice(lastEthCallIdx)}`,
				)
			} else {
				console.log('No eth_call found in logs')
			}

			throw err
		}
	}

	async function getTokenPrices(tokenIn: Token, tokenOut: Token) {
		const tokenStates = await priceOracleService.getPrices(
			[tokenIn, tokenOut],
			{ updateInterval: false, useCachedValues: true },
		)

		const tokenInState = tokenStates.find(
			(tokenState) => tokenState.currency.address === tokenIn.address,
		)

		const tokenOutState = tokenStates.find(
			(tokenState) => tokenState.currency.address === tokenOut.address,
		)

		if (tokenInState === undefined || tokenOutState === undefined)
			throw new Error('should never throw')

		return {
			tokenInPrice: tokenInState.price,
			tokenOutPrice: tokenOutState.price,
		}
	}
}
