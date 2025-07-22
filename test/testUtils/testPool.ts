import { Chain, Client, erc20Abi, getContract, WalletClient } from 'viem'
import { Pool } from '../../src/dex/base/Pool'
import { PoolType, PoolUtils } from '../../src/dex/PoolUtils'
import { PriceOracle } from '../../src/modules/PriceOracle/PriceOracle'
import { Token } from '../../src/primitives/tokens/Token'
import { ClientManager } from '../../src/utils/ChainClientService'
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

	useAnvil({
		chainId: chain.id,
		timeoutStartAnvil: 20000,
		rpcUrl,
	})

	beforeAll(async () => {
		client = ClientManager.getClient(chain.id)
		walletClient = ClientManager.getWalletClient(chain.id)
		botAddress = walletClient.account!.address

		pool = await PoolUtils.createPool(poolAddress, chain.id, poolType)

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
		const tokenInPrice = await PriceOracle.getPrice(tokenIn, {
			updateInterval: false,
		})
		const tokenOutPrice = await PriceOracle.getPrice(tokenOut, {
			updateInterval: false,
		})

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

		await tokenInContract.write.approve([pool.routerAddress, amountIn], {
			account: walletClient.account!,
			chain: walletClient.chain,
		})

		const tokenInBalanceBefore = await tokenInContract.read.balanceOf([
			botAddress,
		])

		const tokenOutBalanceBefore = await tokenOutContract.read.balanceOf([
			botAddress,
		])

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
	}
}
