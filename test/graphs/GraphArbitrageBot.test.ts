import { TransactionReceipt } from 'viem'
import { arbitrum, fuse } from 'viem/chains'
import { Pool } from '../../src/dex/base/Pool'
import { PoolUtils } from '../../src/dex/PoolUtils'
import { PoolType } from '../../src/dex/poolVariety'
import { GraphArbitrageBot } from '../../src/graphs/GraphArbitrageBot'
import { GraphBuilder } from '../../src/graphs/GraphBuilder'
import {
	ActionType,
	FuseBridgeEdge,
	StargateBridgeEdge,
	SwapEdge,
	UnwrapEdge,
	WrapEdge,
} from '../../src/graphs/primitives/Edge'
import { Graph } from '../../src/graphs/primitives/Graph'
import { TgArbitrageNotifier } from '../../src/modules/notification/TgArbitrageNotifier'
import { PriceOracle } from '../../src/modules/PriceOracle/PriceOracle'
import { TokenAmount } from '../../src/primitives/tokens/TokenAmount'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { ClientManager } from '../../src/utils/ClientManager'
import { wait } from '../../src/utils/common'
import logger from '../../src/utils/logger'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GraphArbitrageBot', () => {
	const notifier = {
		sendArbitrageStart: () => Promise.resolve(),
		sendArbitrageEnd: () => Promise.resolve(),
		sendArbitrageError: () => Promise.resolve(),
	} as unknown as TgArbitrageNotifier
	const wethWbtcFuseAddress = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992'
	const wethWbtcArbAddress = '0x2f5e87C9312fa29aed5c179E456625D79015299c'

	let swapWbtcToWethOnFuseRateMock: jest.Mock
	let swapWethToWbtcOnArbitrumRateMock: jest.Mock
	let wethWbtcFuse: Pool
	let wethWbtcArb: Pool
	let graph: Graph
	let bot: GraphArbitrageBot

	beforeAll(async () => {
		jest.spyOn(PriceOracle, 'getPrice').mockResolvedValue(3000)

		ClientManager.useCustomRpcUrl(arbitrum.id)

		wethWbtcFuse = await PoolUtils.createPool(
			wethWbtcFuseAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)

		wethWbtcArb = await PoolUtils.createPool(
			wethWbtcArbAddress,
			arbitrum.id,
			PoolType.UNIV3,
		)

		graph = await GraphBuilder.build({
			pools: [wethWbtcFuse, wethWbtcArb],
			edgeCacheTTL: 1,
		})
	})

	afterAll(() => {
		ClientManager.clearClients()
	})

	beforeEach(async () => {
		const bridgeExecuteImpl = async (): Promise<
			EdgeExecutionResult<BridgeActionType>
		> => {
			await wait(500)
			return {
				amountOut: 10n * 22n,
				srcTxReceipt: {
					transactionHash: '0x1',
				} as Partial<TransactionReceipt> as TransactionReceipt,
				bridgeFee: new TokenAmount(
					TokenUtils.getNative(fuse.id), // doesn't matter, it could be any token
					10n,
				),
				dstTxHash: '0x1',
			}
		}
		jest.spyOn(StargateBridgeEdge.prototype, 'execute').mockImplementation(
			bridgeExecuteImpl,
		)
		jest.spyOn(FuseBridgeEdge.prototype, 'execute').mockImplementation(
			bridgeExecuteImpl,
		)

		const inchainExecuteResolvedValue = {
			amountOut: 10n * 22n,
			txReceipt: {
				transactionHash: '0x1',
			} as Partial<TransactionReceipt> as TransactionReceipt,
		}

		jest.spyOn(SwapEdge.prototype, 'execute').mockResolvedValue(
			inchainExecuteResolvedValue,
		)

		jest.spyOn(WrapEdge.prototype, 'execute').mockResolvedValue(
			inchainExecuteResolvedValue,
		)

		jest.spyOn(UnwrapEdge.prototype, 'execute').mockResolvedValue(
			inchainExecuteResolvedValue,
		)

		swapWbtcToWethOnFuseRateMock = jest.fn().mockReturnValue(-100)
		swapWethToWbtcOnArbitrumRateMock = jest.fn().mockReturnValue(10)

		for (const [, edge] of graph.edges) {
			if (edge.actionType === ActionType.SWAP) {
				const from = await TokenUtils.fromId(edge.from.id)

				if (from.symbol === 'WETH' && from.chainId === fuse.id) {
					edge.quote = (amountIn: bigint) => {
						return Promise.resolve({
							amountOut: amountIn / 100n,
							rate: 100,
							cost: {
								gas: 0n,
							},
						})
					}
					continue
				}

				if (from.symbol === 'WBTC' && from.chainId === fuse.id) {
					edge.quote = (amountIn: bigint) => {
						return Promise.resolve({
							amountOut: amountIn * 100n,
							rate: swapWbtcToWethOnFuseRateMock(),
							cost: {
								gas: 0n,
							},
						})
					}
					continue
				}

				if (from.symbol === 'WETH' && from.chainId === arbitrum.id) {
					edge.quote = (amountIn: bigint) => {
						return Promise.resolve({
							amountOut: amountIn / 10n,
							rate: swapWethToWbtcOnArbitrumRateMock(),
							cost: {
								gas: 0n,
							},
						})
					}
					continue
				}

				if (from.symbol === 'WBTC' && from.chainId === arbitrum.id) {
					edge.quote = (amountIn: bigint) => {
						return Promise.resolve({
							amountOut: amountIn * 10n,
							rate: -10,
							cost: {
								gas: 0n,
							},
						})
					}
					continue
				}
			}

			edge.quote = (amountIn: bigint) => {
				return Promise.resolve({
					amountOut: amountIn,
					rate: 0,
					cost: {
						gas: 0n,
					},
				})
			}
		}

		bot = new GraphArbitrageBot(
			'Test Bot',
			notifier,
			{
				graph,
				startToken: wethWbtcArb.token0, // WBTC arb
				graphOptimizerOptions: {
					initialValueUSD: 100,
					stepUSD: 10,
					stepsAmount: 1,
					maxPathLength: 10,
				},
			},
			{
				minProfitUsd: 1,
				pollingInterval: 1000,
			},
		)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('execute should throw error if distance becomes positive', async () => {
		const loggerErrorFn = jest
			.spyOn(logger, 'error')
			.mockImplementation(() => {})

		setTimeout(() => {
			swapWbtcToWethOnFuseRateMock.mockReturnValue(1000)
		}, 100)

		await bot.findAndExecuteArbitrage()

		expect(loggerErrorFn).toHaveBeenCalledWith(
			new Error('Profitability check failed, distance: 1010'),
			'Error executing arbitrage',
		)
	})

	it('should find and execute arbitrage', async () => {
		await wait(0) // wait for edge cache to be expired

		const loggerInfoFn = jest
			.spyOn(logger, 'info')
			.mockImplementation(() => {})

		await bot.findAndExecuteArbitrage()

		assertArbitrageIsFinished(loggerInfoFn)
	})

	it('should find and execute arbitrage even if swap rate changes on base chain', async () => {
		const loggerInfoFn = jest
			.spyOn(logger, 'info')
			.mockImplementation(() => {})

		setTimeout(() => {
			swapWethToWbtcOnArbitrumRateMock.mockReturnValue(1000)
		}, 100)

		await bot.findAndExecuteArbitrage()

		assertArbitrageIsFinished(loggerInfoFn)
	})
})

function assertArbitrageIsFinished(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	loggerInfoFn: jest.SpyInstance<void, [msg: string, ...args: any[]], any>,
) {
	expect(loggerInfoFn).toHaveBeenCalledWith(
		expect.stringMatching(/^Arbitrage is finished/),
	)
}
