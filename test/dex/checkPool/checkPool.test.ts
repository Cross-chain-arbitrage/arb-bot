import {
	Chain,
	Client,
	erc20Abi,
	getAddress,
	getContract,
	WalletClient,
} from 'viem'
import * as viemChains from 'viem/chains'
import { Pool } from '../../../src/dex/base/Pool'
import { PoolUtils } from '../../../src/dex/PoolUtils'
import { PoolType } from '../../../src/dex/poolVariety'
import { PriceOracle } from '../../../src/modules/PriceOracle/PriceOracle'
import { Token } from '../../../src/primitives/tokens/Token'
import { getAlchemyRpcUrl } from '../../../src/utils/alchemy'
import { ClientManager } from '../../../src/utils/ClientManager'
import {
	setNativeBalance,
	setTokenBalance,
	useAnvil,
} from '../../testUtils/anvil'
import { makeSuite } from '../../testUtils/makeSuite'

if (process.env.CHECK_POOL === 'true') {
	makeSuite('Pancake V3 pool test', testPool)
} else {
	it.skip('Skip this file in common tests', () => {})
}

function testPool() {
	const { chain, poolAddress, rpcUrl, poolType } = getContext()

	const AMOUNT_IN_USD = 500

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

/**
 * Get and validate pool address, chain and rpc url from environment variables
 */
function getContext(): {
	poolAddress: Address
	chain: Chain
	poolType: PoolType
	rpcUrl: string | undefined
} {
	const chain = getAndValidateChain()

	const poolAddress = getAndValidatePoolAddress()

	const rpcUrl = getAndValidateRpcUrl(chain.id)

	const poolType = getAndValidatePoolType()

	return { poolAddress, chain, rpcUrl, poolType }
}

function getAndValidateChain() {
	const processChainId = process.env.CHECK_POOL_CHAIN_ID

	if (!processChainId) {
		throw new Error('chain id is not set')
	}

	const chainId = Number(processChainId)

	if (isNaN(chainId)) {
		throw new Error('chain id is not a number')
	}

	const chain = Object.values(viemChains).find(
		(chain) => chain.id === chainId,
	)

	if (!chain) {
		throw new Error(`Chain with id ${chainId} not found in viem chains`)
	}

	return chain
}

function getAndValidatePoolAddress() {
	const processPoolAddress = process.env.CHECK_POOL_POOL_ADDRESS

	if (!processPoolAddress) {
		throw new Error('pool address is not set')
	}

	const poolAddress = getAddress(processPoolAddress)

	return poolAddress
}

function getAndValidatePoolType() {
	const poolType = process.env.CHECK_POOL_POOL_TYPE

	if (!poolType) {
		throw new Error('pool type is not set')
	}

	if (!Object.values(PoolType).includes(poolType as PoolType)) {
		throw new Error(
			`Pool type ${poolType} is not valid, use one of the following: ${Object.values(PoolType).join(', ')}`,
		)
	}

	return poolType as PoolType
}

function getAndValidateRpcUrl(chainId: number) {
	let rpcUrl = process.env.CHECK_POOL_RPC_URL

	const useAlchemy = process.env.CHECK_POOL_USE_ALCHEMY === 'true'

	if (useAlchemy && rpcUrl) {
		throw new Error('rpc url is set but alchemy is enabled too')
	}

	if (useAlchemy) {
		rpcUrl = getAlchemyRpcUrl(chainId)
	}

	return rpcUrl
}
