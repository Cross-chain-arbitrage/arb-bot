import { Client, WalletClient } from 'viem'
import { hemi, lightlinkPhoenix } from 'viem/chains'
import { UniV3Pool } from '../../../src/dex/pools/UniV3Pool'
import { Token } from '../../../src/primitives/tokens/Token'
import { TokenUtils } from '../../../src/primitives/tokens/TokenUtils'
import { WrappedNative } from '../../../src/primitives/tokens/WrappedNative'
import { ClientManager } from '../../../src/utils/ClientManager'
import {
	setNativeBalance,
	setTokenBalance,
	useAnvil,
} from '../../testUtils/anvil'
import { makeSuite } from '../../testUtils/makeSuite'

makeSuite('Uniswap V3 pool test', () => {
	describe('Hemi', () => {
		let client: Client
		let walletClient: WalletClient
		let botAddress: Address

		const poolAddress = '0xB46335cAcCccb3fDC2A3F40D9Fd253F5F76919A0'
		const wethAddress = '0x4200000000000000000000000000000000000006'
		const usdcAddress = '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA'

		let WETH: Token
		let USDC: Token
		let pool: UniV3Pool

		useAnvil({
			chainId: hemi.id,
		})

		beforeAll(async () => {
			client = ClientManager.getClient(hemi.id)
			walletClient = ClientManager.getWalletClient(hemi.id)
			botAddress = walletClient.account!.address

			pool = await UniV3Pool.create(poolAddress, hemi.id)

			USDC = await TokenUtils.fromAddress<Token>(usdcAddress, hemi.id)
			WETH = await TokenUtils.fromAddress<Token>(wethAddress, hemi.id)

			await setNativeBalance(client, botAddress, 10n ** 18n)
			await setTokenBalance(botAddress, wethAddress, 10n ** 18n, client)
			await setTokenBalance(botAddress, usdcAddress, 10n ** 18n, client)
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
			await WETH.approve(pool.routerAddress, amountIn)
			const balanceBefore = await USDC.balanceOf(botAddress)

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

			const balanceAfter = await USDC.balanceOf(botAddress)
			expect(balanceAfter - balanceBefore).toBe(amountOut)
			expect(amountOut).toBe(simulated)
			expect(amountOut).toBe(quoteAmountOut)
		})

		it('should swap USDC to WETH', async () => {
			const amountIn = 10n ** 6n * 1000n // 1000 USDC
			await USDC.approve(pool.routerAddress, amountIn)

			const balanceBefore = await WETH.balanceOf(botAddress)

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

			const balanceAfter = await WETH.balanceOf(botAddress)
			expect(balanceAfter - balanceBefore).toBe(amountOut)
			expect(amountOut).toBe(simulated)
		})
	})

	describe('Lightlink Phoenix', () => {
		let client: Client
		const chainId = lightlinkPhoenix.id

		const wethAddress = '0x7EbeF2A4b1B09381Ec5B9dF8C5c6f2dBECA59c73'
		const usdcAddress = '0xbCF8C1B03bBDDA88D579330BDF236B58F8bb2cFd'
		const poolAddress = '0x1125452469E9B9A36FE69249309fCe8925C3eEDa'
		let botAddress: Address

		let WETH: WrappedNative
		let USDC: Token
		let pool: UniV3Pool

		useAnvil({
			chainId,
			timeoutStartAnvil: 20_000,
		})

		beforeAll(async () => {
			client = ClientManager.getClient(chainId)
			const wallet = ClientManager.getWalletClient(chainId)
			botAddress = wallet.account.address

			console.log('Retrieving tokens')

			const [weth, usdc] = await Promise.all([
				TokenUtils.fromAddress<WrappedNative>(wethAddress, chainId),
				TokenUtils.fromAddress<Token>(usdcAddress, chainId),
			])

			WETH = weth
			USDC = usdc

			pool = await UniV3Pool.create(poolAddress, chainId)

			console.log('Tokens retrieved')
		})

		it('should swap WETH to USDC', async () => {
			const amount = WETH.parseUnits('1')

			await setNativeBalance(client, botAddress, WETH.parseUnits('2'))

			await WETH.deposit(amount)

			await WETH.approve(pool.routerAddress, amount)

			const { amountOut, amountIn } = await pool.swap({
				tokenIn: WETH,
				tokenOut: USDC,
				amountIn: amount,
				slippage: 50,
			})

			expect(amountOut).toBeGreaterThan(USDC.parseUnits('1000'))
			expect(amountIn).toBe(amount)
		})

		it('should swap USDC to WETH', async () => {
			const amount = USDC.parseUnits('5000')

			await setTokenBalance(botAddress, USDC.address, amount, client)

			await USDC.approve(pool.routerAddress, amount)

			const { amountOut, amountIn } = await pool.swap({
				tokenIn: USDC,
				tokenOut: WETH,
				amountIn: amount,
				slippage: 50,
			})

			expect(amountOut).toBeGreaterThan(WETH.parseUnits('1'))
			expect(amountIn).toBe(amount)
		})
	})
})
