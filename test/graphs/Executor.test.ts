import { parseEther, WalletClient } from 'viem'
import { arbitrum, fuse } from 'viem/chains'

import { Message } from '@layerzerolabs/scan-client'
import { FuseBridge } from '../../src/bridges/FuseBridge/FuseBridge'
import { FuseBridgeTx } from '../../src/bridges/FuseBridge/FuseBridgeTx'
import { StargateBridgeTx } from '../../src/bridges/stargate/StargateBridgeTx'
import { Pool } from '../../src/dex/Pool'
import { PoolType, PoolUtils } from '../../src/dex/PoolUtils'
import { UniV3Pool } from '../../src/dex/uniswapV3/Pool'
import { Executor } from '../../src/graphs/Executor'
import { ActionType, GraphEdge } from '../../src/graphs/Graph'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { WrappedNative } from '../../src/primitives/tokens/WrappedNative'
import { ClientManager } from '../../src/utils/ClientManager'
import { getAlchemyRpcUrl } from '../../src/utils/alchemy'
import { setNativeBalance, setTokenBalance, useAnvil } from '../utils/anvil'
import { makeSuite } from '../utils/makeSuite'

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
const getRate = () => Promise.resolve({ rate: 1, amountOut: 0n })

makeSuite('Executor', () => {
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
	})

	describe('executeSwap', () => {
		let edge: GraphEdge & {
			type: ActionType.SWAP
			pool: Pool
		}

		beforeAll(() => {
			edge = {
				from: wethToken,
				to: usdtToken,
				type: ActionType.SWAP,
				pool,
				getRate,
			}
		})

		it('should execute a swap and return correct transaction data', async () => {
			const inputAmount = wethToken.parseUnits('0.01')

			// Set up token balance and approval
			await setTokenBalance(
				botAddress,
				wethToken.address,
				51n,
				inputAmount,
				ClientManager.getClient(arbitrum.id),
			)

			await wethToken.approve(
				(pool as UniV3Pool).routerAddress,
				inputAmount,
			)

			const usdtBalanceBefore = await usdtToken.balanceOf(botAddress)

			const result = await Executor.executeSwap(edge, inputAmount)

			const usdtBalanceAfter = await usdtToken.balanceOf(botAddress)

			expect(usdtBalanceAfter).toBe(usdtBalanceBefore + result.amountOut)
			expect(result.srcTxHash).toBeDefined()
			expect(result.dstTxHash).toBeDefined()
			expect(result.srcTxHash).toBe(result.dstTxHash) // Same chain swap
		})

		it('should throw error if swap fails', async () => {
			const inputAmount = wethToken.parseUnits('1000000') // Very large amount

			await expect(
				Executor.executeSwap(edge, inputAmount),
			).rejects.toThrow()
		})

		it('should throw error if token is native', async () => {
			const inputAmount = parseEther('0.1')

			const edge: GraphEdge = {
				from: nativeCurrency,
				to: wethToken,
				type: ActionType.SWAP,
				pool,
				getRate,
			}

			await expect(
				Executor.executeSwap(edge, inputAmount),
			).rejects.toThrow('Cannot swap from native currency')

			edge.from = wethToken
			edge.to = nativeCurrency

			await expect(
				Executor.executeSwap(edge, inputAmount),
			).rejects.toThrow('Cannot swap to native currency')
		})
	})

	describe('executeWrap', () => {
		it('should wrap ETH to WETH successfully', async () => {
			const inputAmount = parseEther('0.1')

			// Set native balance
			await setNativeBalance(
				ClientManager.getClient(arbitrum.id),
				botAddress,
				parseEther('1'),
			)

			const edge: GraphEdge = {
				from: nativeCurrency,
				to: wethToken,
				type: ActionType.WRAP,
				getRate,
			}

			const result = await Executor.executeWrap(edge, inputAmount)

			expect(result.amountOut).toBe(inputAmount)
			expect(result.srcTxHash).toBeDefined()
			expect(result.dstTxHash).toBeDefined()
			expect(result.srcTxHash).toBe(result.dstTxHash)
		})

		it('should throw error when trying to wrap non-WETH token', async () => {
			const regularToken = await TokenUtils.fromAddress<Token>(
				usdtAddress,
				arbitrum.id,
			)

			const edge: GraphEdge = {
				from: nativeCurrency,
				to: regularToken,
				type: ActionType.WRAP,
				getRate,
			}

			await expect(
				Executor.executeWrap(edge, parseEther('0.1')),
			).rejects.toThrow('Cannot wrap non-WETH token')
		})
	})

	describe('executeUnwrap', () => {
		it('should unwrap WETH to ETH successfully', async () => {
			const inputAmount = parseEther('0.1')

			await setTokenBalance(
				botAddress,
				wethToken.address,
				51n,
				inputAmount,
				ClientManager.getClient(arbitrum.id),
			)

			const edge: GraphEdge = {
				from: wethToken,
				to: nativeCurrency,
				type: ActionType.UNWRAP,
				getRate: () =>
					Promise.resolve({ rate: 1, amountOut: inputAmount }),
			}

			const result = await Executor.executeUnwrap(edge, inputAmount)

			expect(result.amountOut).toBe(inputAmount)
			expect(result.srcTxHash).toBeDefined()
			expect(result.dstTxHash).toBeDefined()
			expect(result.srcTxHash).toBe(result.dstTxHash)
		})

		it('should throw error when trying to unwrap non-WETH token', async () => {
			const regularToken = await TokenUtils.fromAddress<Token>(
				usdtAddress,
				arbitrum.id,
			)

			const edge: GraphEdge = {
				from: regularToken,
				to: nativeCurrency,
				type: ActionType.UNWRAP,
				getRate,
			}

			await expect(
				Executor.executeUnwrap(edge, parseEther('0.1')),
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
			const inputAmount = wbtcArbToken.parseUnits('0.001')

			// Set WBTC balance on Arbitrum (slot 51 for WBTC on Arbitrum)
			await setTokenBalance(
				botAddress,
				wbtcArbToken.address,
				51n, // WBTC balance slot on Arbitrum
				inputAmount,
				ClientManager.getClient(arbitrum.id),
			)

			await FuseBridge.approveToBridge(wbtcArbToken, inputAmount)

			const edge: GraphEdge = {
				from: wbtcArbToken,
				to: wbtcFuseToken,
				type: ActionType.FUSE_BRIDGE,
				getRate,
			}

			const result = await Executor.executeFuseBridge(edge, inputAmount)

			expect(result.amountOut).toBe(inputAmount)
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
			const inputAmount = nativeCurrency.parseUnits('0.001')

			await setNativeBalance(
				ClientManager.getClient(arbitrum.id),
				botAddress,
				nativeCurrency.parseUnits('1'),
			)

			const edge: GraphEdge = {
				from: nativeCurrency,
				to: wethFuseToken,
				type: ActionType.STARGATE_BRIDGE,
				getRate,
			}

			const result = await Executor.executeStargateBridge(
				edge,
				inputAmount,
			)

			expect(result.amountOut).toBe(inputAmount)
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

function mockWaitForBridgeToFinish() {
	return Promise.resolve({
		srcTxHash: '0x1234567890abcdef1234567890abcdef12345678',
		dstTxHash: '0xabcdef1234567890abcdef1234567890abcdef12',
	} as Message)
}
