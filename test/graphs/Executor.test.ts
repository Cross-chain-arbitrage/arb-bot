import { parseEther, WalletClient } from 'viem'
import { arbitrum } from 'viem/chains'
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

const wethAddress = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'
const usdtAddress = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const wbtcAddress = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f'
const poolWethUsdtAddress = '0x641C00A822e8b671738d32a431a4Fb6074E5c79d'

/* ======== Variables ======== */

let pool: Pool
let wethToken: WrappedNative
let nativeCurrency: NativeCurrency
let usdtToken: Token
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
		wethToken = await TokenUtils.fromAddress(wethAddress, arbitrum.id)
		usdtToken = await TokenUtils.fromAddress<Token>(
			usdtAddress,
			arbitrum.id,
		)
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
				getRate: () =>
					Promise.resolve({ rate: 1, amountOut: inputAmount }),
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
				getRate: () => Promise.resolve({ rate: 1, amountOut: 0n }),
			}

			await expect(
				Executor.executeWrap(edge, parseEther('0.1')),
			).rejects.toThrow('Cannot wrap non-WETH token')
		})
	})

	describe.skip('executeUnwrap', () => {
		it('should unwrap WETH to ETH successfully', async () => {
			const inputAmount = parseEther('0.1')

			// Set WETH balance
			await setTokenBalance(
				botAddress,
				wethToken.address,
				1n,
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
				getRate: () => Promise.resolve({ rate: 1, amountOut: 0n }),
			}

			await expect(
				Executor.executeUnwrap(edge, parseEther('0.1')),
			).rejects.toThrow('Cannot unwrap non-WETH token')
		})
	})

	describe.skip('executeFuseBridge', () => {
		describe('From Arbitrum to Fuse', () => {
			useAnvil({
				chainId: arbitrum.id,
				rpcUrl: getAlchemyRpcUrl(arbitrum.id),
			})

			let wbtcArbToken: Token
			let wbtcFuseToken: Token
			let walletClient: WalletClient
			let botAddress: Address

			beforeAll(async () => {
				walletClient = ClientManager.getWalletClient(arbitrum.id)
				botAddress = walletClient.account!.address

				wbtcArbToken = await TokenUtils.fromAddress<Token>(
					'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
					arbitrum.id,
				)

				// Create token representation for Fuse chain
				wbtcFuseToken = await TokenUtils.fromAddress<Token>(
					'0x34009565bfEeFded0F7e774629a745636Bf35E82',
					arbitrum.id,
				)
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

				const edge: GraphEdge = {
					from: wbtcArbToken,
					to: wbtcFuseToken,
					type: ActionType.FUSE_BRIDGE,
					getRate: () =>
						Promise.resolve({ rate: 1, amountOut: inputAmount }),
				}

				const result = await Executor.executeFuseBridge(
					edge,
					inputAmount,
				)

				expect(result.amountOut).toBe(inputAmount)
				expect(result.srcTxHash).toBeDefined()
				expect(result.dstTxHash).toBeDefined()
				// For cross-chain bridges, srcTxHash and dstTxHash are different
				expect(result.srcTxHash).not.toBe(result.dstTxHash)
			})
		})

		describe('From Fuse to Arbitrum', () => {
			useAnvil({
				chainId: arbitrum.id,
			})

			let wbtcFuseToken: Token
			let wbtcArbToken: Token
			let walletClient: WalletClient
			let botAddress: Address

			beforeAll(async () => {
				walletClient = ClientManager.getWalletClient(arbitrum.id)
				botAddress = walletClient.account!.address

				wbtcFuseToken = await TokenUtils.fromAddress<Token>(
					'0x34009565bfEeFded0F7e774629a745636Bf35E82',
					arbitrum.id,
				)

				// Create token representation for Arbitrum chain
				wbtcArbToken = await TokenUtils.fromAddress<Token>(
					'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
					arbitrum.id,
				)
			})

			it('should execute Fuse bridge from Fuse to Arbitrum', async () => {
				const inputAmount = wbtcFuseToken.parseUnits('0.001')

				// Set WBTC balance on Fuse
				await setTokenBalance(
					botAddress,
					wbtcFuseToken.address,
					0n, // Standard ERC20 balance slot
					inputAmount,
					ClientManager.getClient(arbitrum.id),
				)

				const edge: GraphEdge = {
					from: wbtcFuseToken,
					to: wbtcArbToken,
					type: ActionType.FUSE_BRIDGE,
					getRate: () =>
						Promise.resolve({ rate: 1, amountOut: inputAmount }),
				}

				const result = await Executor.executeFuseBridge(
					edge,
					inputAmount,
				)

				expect(result.amountOut).toBe(inputAmount)
				expect(result.srcTxHash).toBeDefined()
				expect(result.dstTxHash).toBeDefined()
				// For cross-chain bridges, srcTxHash and dstTxHash are different
				expect(result.srcTxHash).not.toBe(result.dstTxHash)
			})
		})
	})
})
