import {
	Client,
	erc20Abi,
	getContract,
	GetContractReturnType,
	WalletClient,
} from 'viem'
import { hemi } from 'viem/chains'
import { PoolUtils } from '../../../src/dex/PoolUtils'
import { PoolType } from '../../../src/dex/poolVariety'
import { UniV3Pool } from '../../../src/dex/pools/UniV3Pool'
import { ClientManager } from '../../../src/utils/ClientManager'
import {
	setNativeBalance,
	setTokenBalance,
	useAnvil,
} from '../../testUtils/anvil'
import { makeSuite } from '../../testUtils/makeSuite'

const poolAddress = '0xB46335cAcCccb3fDC2A3F40D9Fd253F5F76919A0'
const wethAddress = '0x4200000000000000000000000000000000000006'
const usdcAddress = '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA'

let client: Client
let walletClient: WalletClient
let botAddress: Address
let wethContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let usdcContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let pool: UniV3Pool

makeSuite('Uniswap V3 pool test', () => {
	useAnvil({
		chainId: hemi.id,
	})

	beforeAll(async () => {
		client = ClientManager.getClient(hemi.id)
		walletClient = ClientManager.getWalletClient(hemi.id)
		botAddress = walletClient.account!.address

		pool = (await PoolUtils.createPool(
			poolAddress,
			hemi.id,
			PoolType.UNIV3,
		)) as unknown as UniV3Pool

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

		await setNativeBalance(client, botAddress, 10n ** 18n)
		await setTokenBalance(botAddress, wethAddress, 3n, 10n ** 18n, client)
		await setTokenBalance(botAddress, usdcAddress, 1n, 10n ** 18n, client)
	})

	it('should create pool with correct tokens', () => {
		expect(pool.token0.symbol).toBe('WETH')
		expect(pool.token1.symbol).toBe('USDC.e')
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

	it('should swap WETH to USDC', async () => {
		const amountIn = 10n ** 18n
		await wethContract.write.approve([pool.routerAddress, amountIn], {
			account: walletClient.account!,
			chain: walletClient.chain,
		})
		const balanceBefore = await usdcContract.read.balanceOf([botAddress])

		const { amountOut: quoteAmountOut } = await pool.quoteSwap({
			tokenIn: pool.token0,
			tokenOut: pool.token1,
			amountIn,
		})

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
		expect(amountOut).toBe(quoteAmountOut)
	})

	it('should swap USDC to WETH', async () => {
		const amountIn = 10n ** 6n * 1000n // 1000 USDC
		await usdcContract.write.approve([pool.routerAddress, amountIn], {
			account: walletClient.account!,
			chain: walletClient.chain,
		})

		const balanceBefore = await wethContract.read.balanceOf([botAddress])
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
