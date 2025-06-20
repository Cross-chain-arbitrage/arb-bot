import { parseEther, WalletClient } from 'viem'
import { arbitrum, fuse } from 'viem/chains'

import { FuseBridge } from '../../src/bridges/FuseBridge/FuseBridge'
import { FuseBridgeTx } from '../../src/bridges/FuseBridge/FuseBridgeTx'
import { StargateBridgeTx } from '../../src/bridges/stargate/StargateBridgeTx'
import { Pool } from '../../src/dex/Pool'
import { PoolType, PoolUtils } from '../../src/dex/PoolUtils'
import { UniV3Pool } from '../../src/dex/uniswapV3/Pool'
import { GraphExecutor } from '../../src/graphs/GraphExecutor'
import {
	FuseBridgeEdge,
	StargateBridgeEdge,
	SwapEdge,
	UnwrapEdge,
	WrapEdge,
} from '../../src/graphs/primitives/Edge'
import { Graph } from '../../src/graphs/primitives/Graph'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { WrappedNative } from '../../src/primitives/tokens/WrappedNative'
import { ClientManager } from '../../src/utils/ClientManager'
import { getAlchemyRpcUrl } from '../../src/utils/alchemy'
import { setNativeBalance, setTokenBalance, useAnvil } from '../testUtils/anvil'
import { makeSuite } from '../testUtils/makeSuite'
import { mockWaitForBridgeToFinish } from '../testUtils/mock'

/* ======== Constants arbitrum ======== */

const wethArbAddress = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'
const usdtAddress = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const wbtcArbAddress = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f'
const wbtcFuseAddress = '0x34009565bfEeFded0F7e774629a745636Bf35E82'
const poolWethUsdtAddress = '0x641C00A822e8b671738d32a431a4Fb6074E5c79d'
const wethFuseAddress = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'

/* ======== Variables ======== */

let pool: Pool
let wethToken: WrappedNative
let nativeCurrency: NativeCurrency
let usdtToken: Token
let wbtcArbToken: Token
let wbtcFuseToken: Token
let wethFuseToken: Token
let walletClient: WalletClient
let botAddress: Address
let graph: Graph

const getRate = () => Promise.resolve({ rate: 1, amountOut: 0n })

makeSuite('GraphExecutor', () => {
	useAnvil({
		chainId: arbitrum.id,
		rpcUrl: getAlchemyRpcUrl(arbitrum.id),
	})

	beforeAll(async () => {
		walletClient = ClientManager.getWalletClient(arbitrum.id)
		botAddress = walletClient.account!.address

		pool = await PoolUtils.createPool(
			poolWethUsdtAddress,
			arbitrum.id,
			PoolType.UNIV3,
		)

		nativeCurrency = TokenUtils.getNative(arbitrum.id)

		// Use Promise.all to load all tokens concurrently
		const [
			wethResult,
			usdtResult,
			wbtcArbResult,
			wbtcFuseResult,
			wethFuseResult,
		] = await Promise.all([
			TokenUtils.fromAddress(wethArbAddress, arbitrum.id),
			TokenUtils.fromAddress(usdtAddress, arbitrum.id),
			TokenUtils.fromAddress(wbtcArbAddress, arbitrum.id),
			TokenUtils.fromAddress(wbtcFuseAddress, fuse.id),
			TokenUtils.fromAddress(wethFuseAddress, fuse.id),
		])

		wethToken = wethResult as WrappedNative
		usdtToken = usdtResult as Token
		wbtcArbToken = wbtcArbResult as Token
		wbtcFuseToken = wbtcFuseResult as Token
		wethFuseToken = wethFuseResult as Token
		graph = new Graph()
	})

	describe('executeSwap', () => {
		let edge: SwapEdge

		beforeAll(() => {
			edge = new SwapEdge(wethToken, usdtToken, pool, graph)
			edge.getRate = getRate
		})

		it('should execute a swap and return correct transaction data', async () => {
			const amountIn = wethToken.parseUnits('0.01')

			// Set up token balance and approval
			await setTokenBalance(
				botAddress,
				wethToken.address,
				51n,
				amountIn,
				ClientManager.getClient(arbitrum.id),
			)

			await wethToken.approve((pool as UniV3Pool).routerAddress, amountIn)

			const usdtBalanceBefore = await usdtToken.balanceOf(botAddress)

			const result = await GraphExecutor.executeSwap(edge, amountIn)

			const usdtBalanceAfter = await usdtToken.balanceOf(botAddress)

			expect(usdtBalanceAfter).toBe(usdtBalanceBefore + result.amountOut)
			expect(result.srcTxHash).toBeDefined()
			expect(result.dstTxHash).toBeDefined()
			expect(result.srcTxHash).toBe(result.dstTxHash) // Same chain swap
		})

		it('should throw error if swap fails', async () => {
			const amountIn = wethToken.parseUnits('1000000') // Very large amount

			await expect(
				GraphExecutor.executeSwap(edge, amountIn),
			).rejects.toThrow()
		})

		it('should throw error if token is native', async () => {
			const amountIn = parseEther('0.1')

			const edge = new SwapEdge(
				nativeCurrency as unknown as Token,
				wethToken,
				pool,
				graph,
			)
			edge.getRate = getRate

			await expect(
				GraphExecutor.executeSwap(edge, amountIn),
			).rejects.toThrow('Cannot swap from native currency')

			//@ts-expect-error switch from and to
			edge.from = wethToken
			//@ts-expect-error switch from and to
			edge.to = nativeCurrency

			await expect(
				GraphExecutor.executeSwap(edge, amountIn),
			).rejects.toThrow('Cannot swap to native currency')
		})
	})

	describe('executeWrap', () => {
		it('should wrap ETH to WETH successfully', async () => {
			const amountIn = parseEther('0.1')

			// Set native balance
			await setNativeBalance(
				ClientManager.getClient(arbitrum.id),
				botAddress,
				parseEther('1'),
			)

			const edge = new WrapEdge(nativeCurrency, wethToken, graph)
			edge.getRate = getRate

			const balanceBefore = await wethToken.balanceOf(botAddress)

			const result = await GraphExecutor.executeWrap(edge, amountIn)

			const balanceAfter = await wethToken.balanceOf(botAddress)

			expect(balanceAfter).toBe(balanceBefore + amountIn)
			expect(result.amountOut).toBe(amountIn)
			expect(result.srcTxHash).toBeDefined()
			expect(result.dstTxHash).toBeDefined()
			expect(result.srcTxHash).toBe(result.dstTxHash)
		})

		it('should throw error when trying to wrap non-WETH token', async () => {
			const regularToken = await TokenUtils.fromAddress<Token>(
				usdtAddress,
				arbitrum.id,
			)

			const edge = new WrapEdge(nativeCurrency, regularToken, graph)
			edge.getRate = getRate

			await expect(
				GraphExecutor.executeWrap(edge, parseEther('0.1')),
			).rejects.toThrow('Cannot wrap non-WETH token')
		})
	})

	describe('executeUnwrap', () => {
		it('should unwrap WETH to ETH successfully', async () => {
			const amountIn = parseEther('0.1')

			await setTokenBalance(
				botAddress,
				wethToken.address,
				51n,
				amountIn,
				ClientManager.getClient(arbitrum.id),
			)

			const edge = new UnwrapEdge(wethToken, nativeCurrency, graph)
			edge.getRate = getRate

			const balanceBefore = await nativeCurrency.balanceOf(botAddress)

			const result = await GraphExecutor.executeUnwrap(edge, amountIn)
			const receipt = await ClientManager.getClient(
				arbitrum.id,
			).getTransactionReceipt({
				hash: result.srcTxHash,
			})

			const balanceAfter = await nativeCurrency.balanceOf(botAddress)

			expect(balanceAfter).toBe(
				balanceBefore +
					amountIn -
					receipt.gasUsed * receipt.effectiveGasPrice,
			)
			expect(result.amountOut).toBe(amountIn)
			expect(result.srcTxHash).toBeDefined()
			expect(result.dstTxHash).toBeDefined()
			expect(result.srcTxHash).toBe(result.dstTxHash)
		})

		it('should throw error when trying to unwrap non-WETH token', async () => {
			const regularToken = await TokenUtils.fromAddress<Token>(
				usdtAddress,
				arbitrum.id,
			)

			const edge = new UnwrapEdge(regularToken, nativeCurrency, graph)
			edge.getRate = getRate

			await expect(
				GraphExecutor.executeUnwrap(edge, parseEther('0.1')),
			).rejects.toThrow('Cannot unwrap non-WETH token')
		})
	})

	describe('executeFuseBridge', () => {
		beforeEach(() => {
			jest.spyOn(
				FuseBridgeTx.prototype,
				'waitForBridgeToFinish',
			).mockImplementation(mockWaitForBridgeToFinish)
		})

		afterEach(() => {
			jest.restoreAllMocks()
		})

		it('should execute Fuse bridge from Arbitrum to Fuse', async () => {
			const amountIn = wbtcArbToken.parseUnits('0.001')

			// Set WBTC balance on Arbitrum (slot 51 for WBTC on Arbitrum)
			await setTokenBalance(
				botAddress,
				wbtcArbToken.address,
				51n, // WBTC balance slot on Arbitrum
				amountIn,
				ClientManager.getClient(arbitrum.id),
			)

			await FuseBridge.approveToBridge(wbtcArbToken, amountIn, fuse.id)

			const edge = new FuseBridgeEdge(wbtcArbToken, wbtcFuseToken, graph)
			edge.getRate = getRate

			const result = await GraphExecutor.executeFuseBridge(edge, amountIn)

			expect(result.amountOut).toBe(amountIn)
			expect(result.srcTxHash).toBe(
				'0x1234567890abcdef1234567890abcdef12345678',
			)
			expect(result.dstTxHash).toBe(
				'0xabcdef1234567890abcdef1234567890abcdef12',
			)
			// For cross-chain bridges, srcTxHash and dstTxHash are different
			expect(result.srcTxHash).not.toBe(result.dstTxHash)
		})
	})

	describe('executeStargateBridge', () => {
		beforeEach(() => {
			jest.spyOn(
				StargateBridgeTx.prototype,
				'waitForBridgeToFinish',
			).mockImplementation(mockWaitForBridgeToFinish)
		})

		afterEach(() => {
			jest.restoreAllMocks()
		})

		it('should execute Stargate bridge from Arbitrum to Fuse', async () => {
			const amountIn = nativeCurrency.parseUnits('0.001')

			await setNativeBalance(
				ClientManager.getClient(arbitrum.id),
				botAddress,
				nativeCurrency.parseUnits('1'),
			)

			const edge = new StargateBridgeEdge(
				nativeCurrency,
				wethFuseToken,
				graph,
			)
			edge.getRate = getRate

			const result = await GraphExecutor.executeStargateBridge(
				edge,
				amountIn,
			)

			expect(result.amountOut).toBe(amountIn)
			expect(result.srcTxHash).toBe(
				'0x1234567890abcdef1234567890abcdef12345678',
			)
			expect(result.dstTxHash).toBe(
				'0xabcdef1234567890abcdef1234567890abcdef12',
			)
			expect(result.srcTxHash).not.toBe(result.dstTxHash)
		})
	})
})
