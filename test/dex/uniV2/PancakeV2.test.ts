import {
	erc20Abi,
	getContract,
	GetContractReturnType,
	WalletClient,
} from 'viem'
import { bsc } from 'viem/chains'
import { PancakeV2Pool } from '../../../src/dex/pools/PancakeV2Pool'
import { getAlchemyRpcUrl } from '../../../src/utils/alchemy'
import { ClientManager } from '../../../src/utils/ClientManager'
import {
	setNativeBalance,
	setTokenBalance,
	useAnvil,
} from '../../testUtils/anvil'
import { makeSuite } from '../../testUtils/makeSuite'
/* ======== Constants ======== */

const poolAddress = '0x6483F166b9E4310A165a55FEa04F867499aded06' // WBNB/FUSE pool
const wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const fuseAddress = '0x5857c96DaE9cF8511B08Cb07f85753C472D36Ea3'

/* ======== Variables ======== */

let walletClient: WalletClient
let botAddress: Address
let WBNB: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let FUSE: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let pool: PancakeV2Pool

makeSuite('Pancake V2 Pool', () => {
	useAnvil({
		chainId: bsc.id,
		rpcUrl: getAlchemyRpcUrl(bsc.id),
		timeoutStartAnvil: 20000,
	})

	beforeAll(async () => {
		walletClient = ClientManager.getWalletClient(bsc.id)
		botAddress = walletClient.account!.address
		pool = await PancakeV2Pool.create(poolAddress, bsc.id)
		FUSE = getContract({
			address: pool.token0.address,
			abi: erc20Abi,
			client: walletClient,
		})
		WBNB = getContract({
			address: pool.token1.address,
			abi: erc20Abi,
			client: walletClient,
		})
	})

	describe('Pool Creation', () => {
		it('should create pool with correct tokens', () => {
			expect(pool.token0.symbol).toBe('FUSE')
			expect(pool.token1.symbol).toBe('WBNB')
		})

		it('should get correct reserves', async () => {
			const reserves = await pool.getReserves()
			expect(reserves[0]).toBeDefined()
			expect(reserves[1]).toBeDefined()
			expect(reserves[2]).toBeDefined() // timestamp
		})
	})

	describe('Price Calculations', () => {
		it('should calculate correct price from reserves', async () => {
			const { price } = await pool.getPrices()
			expect(price).toBeGreaterThan(0)
		})
	})

	describe('Swap Quoting', () => {
		it('should quote swap WBNB to FUSE', async () => {
			const amountIn = pool.token1.parseUnits('1')

			const { amountOut, fee } = await pool.quoteSwap({
				tokenIn: pool.token1,
				tokenOut: pool.token0,
				amountIn,
			})
			expect(amountOut).toBeDefined()
			expect(fee).toBe(0.0025) // 0.25% fee
		})

		it('should quote swap FUSE to WBNB', async () => {
			const amountIn = pool.token0.parseUnits('1000')

			const { amountOut, fee } = await pool.quoteSwap({
				tokenIn: pool.token0,
				tokenOut: pool.token1,
				amountIn,
			})
			expect(amountOut).toBeDefined()
			expect(fee).toBe(0.0025)
		})
	})

	describe('Swap Execution', () => {
		beforeEach(async () => {
			const client = ClientManager.getClient(bsc.id)

			// Set up test balances
			await setNativeBalance(client, botAddress, 10n ** 18n)

			await setTokenBalance(
				botAddress,
				wbnbAddress,
				3n,
				10n ** 25n,
				client,
			)

			await setTokenBalance(
				botAddress,
				fuseAddress,
				0n,
				10n ** 25n,
				client,
			)
		})

		it('should swap WBNB to FUSE', async () => {
			const amountIn = pool.token1.parseUnits('1')

			await WBNB.write.approve([pool.routerAddress, amountIn], {
				account: walletClient.account!,
				chain: walletClient.chain,
			})

			const balanceBefore = await FUSE.read.balanceOf([botAddress])

			const { amountOut: amountOutQuote, fee } = await pool.quoteSwap({
				tokenIn: pool.token1,
				tokenOut: pool.token0,
				amountIn,
			})

			const { amountOut: simulated } = await pool.simulateSwap({
				tokenIn: pool.token1,
				tokenOut: pool.token0,
				amountIn,
				slippage: 50,
			})

			const { amountOut } = await pool.swap({
				tokenIn: pool.token1,
				tokenOut: pool.token0,
				amountIn,
				slippage: 50,
			})

			const fuseBalanceAfter = await FUSE.read.balanceOf([botAddress])

			expect(fuseBalanceAfter - balanceBefore).toBe(amountOut)
			expect(amountOut).toBe(simulated)
			expect(amountOut).toBe(amountOutQuote)
		})

		it('should swap FUSE to WBNB', async () => {
			const amountIn = pool.token1.parseUnits('1000')

			await FUSE.write.approve([pool.routerAddress, amountIn], {
				account: walletClient.account!,
				chain: walletClient.chain,
			})

			const balanceBefore = await WBNB.read.balanceOf([botAddress])

			const { amountOut: simulated } = await pool.simulateSwap({
				tokenIn: pool.token0,
				tokenOut: pool.token1,
				amountIn,
				slippage: 50,
			})

			const { amountOut } = await pool.swap({
				tokenIn: pool.token0,
				tokenOut: pool.token1,
				amountIn,
				slippage: 50,
			})

			const balanceAfter = await WBNB.read.balanceOf([botAddress])

			expect(balanceAfter - balanceBefore).toBe(amountOut)
			expect(amountOut).toBe(simulated)
		})
	})

	describe('Error Handling', () => {
		it('should throw when amount in is too low', () => {
			expect(() =>
				pool.validateMismatchSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token1,
					amountIn: 1n,
				}),
			).toThrow('Amount in is too low, 0.000000000000000001 FUSE')
		})

		it('should throw when slippage is too high', () => {
			expect(() =>
				pool.validateMismatchSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token1,
					amountIn: 10n ** 18n,
					slippage: 5000,
				}),
			).toThrow('Slippage is too high: 50%')
		})

		it('should throw when tokens are the same', () => {
			expect(() =>
				pool.validateMismatchSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token0,
					amountIn: 10n ** 18n,
				}),
			).toThrow('Token in and token out cannot be the same')
		})
	})
})
