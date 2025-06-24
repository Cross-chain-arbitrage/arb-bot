import {
	Client,
	erc20Abi,
	getContract,
	GetContractReturnType,
	WalletClient,
} from 'viem'
import { bsc } from 'viem/chains'
import { PancakeV3Pool } from '../../../src/dex/pools/PancakeV3Pool'
import { PoolUtils } from '../../../src/dex/PoolUtils'
import { PoolType } from '../../../src/dex/poolVariety'
import { getAlchemyRpcUrl } from '../../../src/utils/alchemy'
import { ClientManager } from '../../../src/utils/ClientManager'
import {
	setNativeBalance,
	setTokenBalance,
	useAnvil,
} from '../../testUtils/anvil'
import { makeSuite } from '../../testUtils/makeSuite'

const poolAddress = '0x172fcd41e0913e95784454622d1c3724f546f849'
const wbnbAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
const usdtAddress = '0x55d398326f99059ff775485246999027b3197955'

let client: Client
let walletClient: WalletClient
let botAddress: Address
let wethContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let usdcContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let pool: PancakeV3Pool

makeSuite('Pancake V3 pool test', () => {
	useAnvil({
		chainId: bsc.id,
		rpcUrl: getAlchemyRpcUrl(bsc.id),
		timeoutStartAnvil: 20000,
	})

	beforeAll(async () => {
		client = ClientManager.getClient(bsc.id)
		walletClient = ClientManager.getWalletClient(bsc.id)
		botAddress = walletClient.account!.address

		pool = (await PoolUtils.createPool(
			poolAddress,
			bsc.id,
			PoolType.PANCAKEV3,
		)) as unknown as PancakeV3Pool

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
		await setTokenBalance(botAddress, wbnbAddress, 3n, 10n ** 18n, client)
		await setTokenBalance(botAddress, usdtAddress, 1n, 10n ** 18n, client)
	})

	it('should create pool with correct tokens', () => {
		expect(pool.token0.symbol).toBe('USDT')
		expect(pool.token1.symbol).toBe('WBNB')
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
