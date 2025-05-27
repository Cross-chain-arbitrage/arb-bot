import { mainnet } from 'viem/chains'
import { ClientManager } from '../../../src/utils/ClientManager'
import {
	Client,
	erc20Abi,
	getContract,
	GetContractReturnType,
	WalletClient,
} from 'viem'
import { UniV2Pool } from '../../../src/dex/uniswapV2/Pool'
import { setNativeBalance, setTokenBalance } from '../../utils/anvil'
import { useAnvil } from '../../utils/anvil'
import { makeSuite } from '../../utils/makeSuite'

/* ======== Constants ======== */

const poolAddress = '0x4Ce3687fEd17e19324F23e305593Ab13bBd55c4D' // WETH/USDC pool
const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const fuseAddress = '0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d'

/* ======== Variables ======== */

let client: Client
let walletClient: WalletClient
let botAddress: Address
let wethContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let usdcContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let pool: UniV2Pool

makeSuite('Uniswap V2 Pool', () => {
	useAnvil(mainnet.id)

	beforeAll(async () => {
		client = ClientManager.getClient(mainnet.id)
		walletClient = ClientManager.getWalletClient(mainnet.id)
		botAddress = walletClient.account!.address

		pool = await UniV2Pool.create(poolAddress, mainnet.id)

		usdcContract = getContract({
			address: pool.token1.address,
			abi: erc20Abi,
			client: walletClient,
		})

		wethContract = getContract({
			address: pool.token0.address,
			abi: erc20Abi,
			client: walletClient,
		})

		// Set up test balances
		await setNativeBalance(client, botAddress, 10n ** 18n)
		await setTokenBalance(botAddress, wethAddress, 1n, 10n ** 18n, client)
		await setTokenBalance(botAddress, fuseAddress, 1n, 10n ** 18n, client)
	})

	describe('Pool Creation', () => {
		it('should create pool with correct tokens', () => {
			expect(pool.token0.symbol).toBe('FUSE')
			expect(pool.token1.symbol).toBe('WETH')
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
		it('should quote swap WETH to USDC', async () => {
			const amountIn = 10n ** 18n // 1 WETH
			const { amountOut, fee } = await pool.quoteSwap({
				tokenIn: pool.token0,
				tokenOut: pool.token1,
				amountIn,
			})
			expect(amountOut).toBeDefined()
			expect(fee).toBe(0.003) // 0.3% fee
		})

		it('should quote swap USDC to WETH', async () => {
			const amountIn = 10n ** 6n * 1000n // 1000 USDC
			const { amountOut, fee } = await pool.quoteSwap({
				tokenIn: pool.token1,
				tokenOut: pool.token0,
				amountIn,
			})
			expect(amountOut).toBeDefined()
			expect(fee).toBe(0.003)
		})
	})

	describe('Swap Execution', () => {
		it('should swap WETH to USDC', async () => {
			const amountIn = 10n ** 18n // 1 WETH
			await wethContract.write.approve([pool.routerAddress, amountIn], {
				account: walletClient.account!,
				chain: walletClient.chain,
			})

			const balanceBefore = await usdcContract.read.balanceOf([
				botAddress,
			])
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

			const balanceAfter = await usdcContract.read.balanceOf([botAddress])
			expect(balanceAfter - balanceBefore).toBe(amountOut)
			expect(amountOut).toBe(simulated)
		})

		it('should swap USDC to WETH', async () => {
			const amountIn = 10n ** 6n * 1000n // 1000 USDC
			await usdcContract.write.approve([pool.routerAddress, amountIn], {
				account: walletClient.account!,
				chain: walletClient.chain,
			})

			const balanceBefore = await wethContract.read.balanceOf([
				botAddress,
			])
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

			const balanceAfter = await wethContract.read.balanceOf([botAddress])
			expect(balanceAfter - balanceBefore).toBe(amountOut)
			expect(amountOut).toBe(simulated)
		})
	})

	describe('Error Handling', () => {
		it('should throw when amount in is too low', async () => {
			await expect(
				pool.validateMismatchSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token1,
					amountIn: 1n,
				}),
			).rejects.toThrow('Amount in is too low')
		})

		it('should throw when slippage is too high', async () => {
			await expect(
				pool.validateMismatchSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token1,
					amountIn: 10n ** 18n,
					slippage: 5000,
				}),
			).rejects.toThrow('Slippage is too high')
		})

		it('should throw when tokens are the same', async () => {
			await expect(
				pool.validateMismatchSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token0,
					amountIn: 10n ** 18n,
				}),
			).rejects.toThrow('Token in and token out cannot be the same')
		})
	})
})
