import {
	erc20Abi,
	getContract,
	GetContractReturnType,
	WalletClient,
} from 'viem'
import { mainnet } from 'viem/chains'
import { UniV2Pool } from '../../../src/dex/pools/UniV2Pool'
import { getAlchemyRpcUrl } from '../../../src/utils/alchemy'
import { ClientManager } from '../../../src/utils/ClientManager'
import {
	setNativeBalance,
	setTokenBalance,
	useAnvil,
} from '../../testUtils/anvil'
import { makeSuite } from '../../testUtils/makeSuite'

/* ======== Constants ======== */

const poolAddress = '0x4Ce3687fEd17e19324F23e305593Ab13bBd55c4D' // WETH/FUSE pool
const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const fuseAddress = '0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d'

/* ======== Variables ======== */

let walletClient: WalletClient
let botAddress: Address
let WETH: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let FUSE: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let pool: UniV2Pool

makeSuite('Uniswap V2 Pool', () => {
	useAnvil({
		chainId: mainnet.id,
		rpcUrl: getAlchemyRpcUrl(mainnet.id),
		timeoutStartAnvil: 20000,
	})

	beforeAll(async () => {
		walletClient = ClientManager.getWalletClient(mainnet.id)
		botAddress = walletClient.account!.address
		pool = await UniV2Pool.create(poolAddress, mainnet.id)
		FUSE = getContract({
			address: pool.token0.address,
			abi: erc20Abi,
			client: walletClient,
		})
		WETH = getContract({
			address: pool.token1.address,
			abi: erc20Abi,
			client: walletClient,
		})
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
		it('should quote swap WETH to FUSE', async () => {
			const amountIn = pool.token1.parseUnits('1')

			const { amountOut } = await pool.quoteSwap({
				tokenIn: pool.token1,
				tokenOut: pool.token0,
				amountIn,
			})
			expect(amountOut).toBeDefined()
		})

		it('should quote swap FUSE to WETH', async () => {
			const amountIn = pool.token0.parseUnits('1000')

			const { amountOut } = await pool.quoteSwap({
				tokenIn: pool.token0,
				tokenOut: pool.token1,
				amountIn,
			})
			expect(amountOut).toBeDefined()
		})
	})

	describe('Swap Execution', () => {
		beforeEach(async () => {
			const client = ClientManager.getClient(mainnet.id)

			// Set up test balances
			await setNativeBalance(client, botAddress, 10n ** 18n)

			await setTokenBalance(botAddress, wethAddress, 10n ** 25n, client)

			await setTokenBalance(botAddress, fuseAddress, 10n ** 25n, client)
		})

		it('should swap WETH to FUSE', async () => {
			const amountIn = pool.token1.parseUnits('1')

			await WETH.write.approve([pool.routerAddress, amountIn], {
				account: walletClient.account!,
				chain: walletClient.chain,
			})

			const balanceBefore = await FUSE.read.balanceOf([botAddress])

			const { amountOut: amountOutQuote } = await pool.quoteSwap({
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

		it('should swap FUSE to WETH', async () => {
			const amountIn = pool.token1.parseUnits('1000')

			await FUSE.write.approve([pool.routerAddress, amountIn], {
				account: walletClient.account!,
				chain: walletClient.chain,
			})

			const balanceBefore = await WETH.read.balanceOf([botAddress])

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

			const balanceAfter = await WETH.read.balanceOf([botAddress])

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
