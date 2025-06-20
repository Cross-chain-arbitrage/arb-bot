import { arbitrum, fuse, hemi } from 'viem/chains'

import { Stargate } from '../../src/bridges/stargate/Stargate'
import { StargateBridgeTx } from '../../src/bridges/stargate/StargateBridgeTx'
import { Graph } from '../../src/graphs/Graph'
import { GraphExecutor } from '../../src/graphs/GraphExecutor'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { getAlchemyRpcUrl } from '../../src/utils/alchemy'
import { ClientManager } from '../../src/utils/ClientManager'
import { setNativeBalance, setTokenBalance, useAnvil } from '../testUtils/anvil'
import { makeSuite } from '../testUtils/makeSuite'
import { mockWaitForBridgeToFinish } from '../testUtils/mock'

makeSuite('Stargate', () => {
	describe('Arbitrum One', () => {
		const USDT = new Token(
			'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
			arbitrum.id,
			'USD₮0',
			6,
			'USD₮0',
		)
		const ETH = TokenUtils.getNative(arbitrum.id)

		useAnvil({
			chainId: arbitrum.id,
			rpcUrl: getAlchemyRpcUrl(arbitrum.id),
		})

		it('MUST simulate sending Token', async () => {
			console.time('STG')
			const amount = USDT.parseUnits('1')
			const balanceSlot = 51n
			const wallet = ClientManager.getWalletClient(arbitrum.id)
			const recipient = wallet.account!.address

			console.time('setTokenBalance')

			await setTokenBalance(
				recipient,
				USDT.address,
				balanceSlot,
				amount,
				wallet,
			)

			console.timeEnd('setTokenBalance')

			console.time('getBridgeAddress')
			const bridgeAddr = await Stargate.getBridgeAddress(USDT)
			console.timeEnd('getBridgeAddress')

			console.time('approve')
			await USDT.approve(bridgeAddr, amount)
			console.timeEnd('approve')

			console.time('bridge')
			const result = await Stargate.bridge(
				USDT,
				fuse.id,
				recipient,
				amount,
			)
			console.timeEnd('bridge')

			expect(result).toBeDefined()
			expect(result.bridgeTx.srcTx.hash).toBeDefined()
			expect(result.bridgeTx.srcTx.chainId).toBe(arbitrum.id)
			console.timeEnd('STG')
		})

		it('MUST simulate sending Native', async () => {
			const amount = ETH.parseUnits('1')

			const wallet = ClientManager.getWalletClient(arbitrum.id)
			const recipient = wallet.account!.address

			await setNativeBalance(wallet, recipient, amount * 2n)

			const result = await Stargate.bridge(
				ETH,
				fuse.id,
				recipient,
				amount,
				true,
			)

			expect(result).toBeDefined()
			expect(result.bridgeTx.srcTx.hash).toBeDefined()
			expect(result.bridgeTx.srcTx.chainId).toBe(arbitrum.id)
		})

		describe('getExpectedAmountOut', () => {
			it('MUST return same amount for USDT', async () => {
				const USDT0 = await TokenUtils.fromAddress<Token>(
					'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
					arbitrum.id,
				)

				const amount = USDT0.parseUnits('1')

				const { expectedAmountOut, tokenOut, quote } =
					await Stargate.getExpectedAmountOut(USDT0, amount, fuse.id)

				expect(tokenOut.address).toBe(
					'0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7',
				)
				expect(tokenOut.chainId).toBe(fuse.id)
				expect(expectedAmountOut).toBe(amount)

				expect(quote).toBeDefined()
				expect(quote.oftLimit).toBeDefined()
				expect(quote.oftFeeDetails).toBeDefined()
				expect(quote.oftReceipt).toBeDefined()
			})

			it('MUST return amount with loss precision for ETH', async () => {
				// Real life example:
				// https://layerzeroscan.com/tx/0x758ac28e912dff96b8ad5e27a631b23e28861757d09b384d515f64f9fd59bf87
				const ETH = TokenUtils.getNative(arbitrum.id)

				const amount = 199559617334342520n
				const realAmountOut = 199559000000000000n

				const { expectedAmountOut: calculatedAmountOut } =
					await Stargate.getExpectedAmountOut(ETH, amount, fuse.id)

				expect(calculatedAmountOut).toBe(realAmountOut)
			})
		})
	})

	describe('Hydra Chains', () => {
		describe('Hemi', () => {
			const tokens: (Token | NativeCurrency)[] = [
				new Token(
					'0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA',
					hemi.id,
					'USDC.e',
					6,
					'Bridged USDC (Stargate)',
				),
				new Token(
					'0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e',
					hemi.id,
					'USDT',
					6,
					'USDT',
				),
				new NativeCurrency(hemi.id, 'ETH', 'ETH'),
			]

			useAnvil({
				chainId: hemi.id,
				// rpcUrl: getAlchemyRpcUrl(hemi.id),
			})

			beforeAll(() => {
				jest.spyOn(
					StargateBridgeTx.prototype,
					'waitForBridgeToFinish',
				).mockImplementation(mockWaitForBridgeToFinish)
			})

			it('Execute Stargate Bridge Edge', async () => {
				const graph = new Graph()

				const ETH_HEMI = TokenUtils.getNative(hemi.id)
				const ETH_ARBITRUM = TokenUtils.getNative(arbitrum.id)

				graph.addNode(ETH_HEMI)
				graph.addNode(ETH_ARBITRUM)

				graph.addStargateBridgeEdge(ETH_HEMI, ETH_ARBITRUM)

				await GraphExecutor.execute({
					path: [...graph.edges].map((edge) => ({
						...edge,
						rate: 1,
					})),
					startAmount: ETH_HEMI.parseUnits('1'),
				})
			})

			tokens.forEach((token) => {
				it(`MUST simulate sending ${token.symbol}`, async () => {
					const amount =
						token instanceof NativeCurrency
							? token.parseUnits('1')
							: token.parseUnits('500')

					// const balanceSlot = 4n
					const wallet = ClientManager.getWalletClient(hemi.id)
					const recipient = wallet.account!.address

					if (token instanceof NativeCurrency) {
						await setNativeBalance(wallet, recipient, amount * 2n)
					} else {
						// const balanceSlot = token.symbol === 'USDT' ? 4n : 8n
						for (let i = 50; i < 100; i++) {
							await setTokenBalance(
								recipient,
								token.address,
								BigInt(i),
								amount,
								wallet,
							)
						}
					}

					const bridgeAddr = await Stargate.getBridgeAddress(token)

					if (token instanceof Token) {
						await token.approve(bridgeAddr, amount)
					}

					const result = await Stargate.bridge(
						token,
						arbitrum.id,
						recipient,
						amount,
					)

					expect(result).toBeDefined()
					expect(result.bridgeTx.srcTx.hash).toBeDefined()
					expect(result.bridgeTx.srcTx.chainId).toBe(hemi.id)
				})
			})
		})
	})
})
