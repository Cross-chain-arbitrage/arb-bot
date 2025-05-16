import { fuse } from 'viem/chains'
import { PoolType, PoolUtils } from '../../../src/dex/PoolUtils'
import { ClientManager } from '../../../src/utils/ClientManager'
import {
	Client,
	erc20Abi,
	getContract,
	GetContractReturnType,
	WalletClient,
} from 'viem'
import { AlgebraPool } from '../../../src/dex/algebra/Pool'
import { setNativeBalance, setTokenBalance } from '../../utils/anvil'
import { useAnvil } from '../../utils/anvil'
import { makeSuite } from '../../utils/makeSuite'

/* ======== Constants ======== */

const wethUsdtPoolAddress = '0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6'
const wethAddress = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
const usdtAddress = '0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7'

/* ======== Variables ======== */

let client: Client
let walletClient: WalletClient
let botAddress: Address
let wethContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let usdtContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let pool: AlgebraPool

/* ======== Tests ======== */

makeSuite('algebra pool test', () => {
	useAnvil(fuse.id)

	beforeAll(async () => {
		client = ClientManager.getClient(fuse.id)
		walletClient = ClientManager.getWalletClient(fuse.id)
		botAddress = walletClient.account!.address

		pool = (await PoolUtils.createPool(
			wethUsdtPoolAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)) as AlgebraPool

		usdtContract = getContract({
			address: pool.token1.address,
			abi: erc20Abi,
			client: walletClient,
		})

		wethContract = getContract({
			address: pool.token0.address,
			abi: erc20Abi,
			client: walletClient,
		})

		const balanceSlotIndex = 1n

		await setNativeBalance(client, botAddress, 10n ** 18n)

		await setTokenBalance(
			botAddress,
			wethAddress,
			balanceSlotIndex,
			10n ** 18n,
			client,
		)

		await setTokenBalance(
			botAddress,
			usdtAddress,
			balanceSlotIndex,
			10n ** 18n,
			client,
		)
	})

	it('should quote swap', async () => {
		const amountIn = 10n ** 18n

		const { amountOut } = await pool.quoteSwap({
			tokenIn: pool.token0,
			tokenOut: pool.token1,
			amountIn,
		})

		expect(amountOut).toBeDefined()
	})

	it('should create algebra pool with correct tokens', () => {
		expect(pool.token0.symbol).toBe('WETH')
		expect(pool.token1.symbol).toBe('USDT')
	})

	it('should simulate and swap token0 to token1', async () => {
		const amountIn = 10n ** 18n

		await wethContract.write.approve([pool.routerAddress, amountIn], {
			account: walletClient.account!,
			chain: walletClient.chain,
		})

		const usdtBalanceBefore = await usdtContract.read.balanceOf([
			walletClient.account!.address,
		])

		const { amountOut: simulatedAmountOut } = await pool.simulateSwap({
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

		const usdtBalanceAfter = await usdtContract.read.balanceOf([
			walletClient.account!.address,
		])

		expect(usdtBalanceAfter).toBe(usdtBalanceBefore + simulatedAmountOut)
		expect(amountOut).toBe(usdtBalanceAfter - usdtBalanceBefore)
	})

	it('should simulate and swap token1 to token0', async () => {
		const pool = await PoolUtils.createPool(
			wethUsdtPoolAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)

		const amountIn = 10n ** 9n

		await usdtContract.write.approve([pool.routerAddress, amountIn], {
			account: walletClient.account!,
			chain: walletClient.chain,
		})

		const wethBalanceBefore = await wethContract.read.balanceOf([
			walletClient.account!.address,
		])

		const { amountOut: simulatedAmountOut } = await pool.simulateSwap({
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

		const wethBalanceAfter = await wethContract.read.balanceOf([
			walletClient.account!.address,
		])

		expect(wethBalanceAfter).toBe(wethBalanceBefore + simulatedAmountOut)
		expect(wethBalanceAfter - wethBalanceBefore).toBe(amountOut)
	})
})
