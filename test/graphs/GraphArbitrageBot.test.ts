import { arbitrum, fuse } from 'viem/chains'
import { Pool } from '../../src/dex/Pool'
import { PoolType, PoolUtils } from '../../src/dex/PoolUtils'
import { GraphArbitrageBot } from '../../src/graphs/GraphArbitrageBot'
import { GraphBuilder } from '../../src/graphs/GraphBuilder'
import { GraphExecutor } from '../../src/graphs/GraphExecutor'

import { Edge } from '../../src/graphs/primitives/Edge'
import { Graph } from '../../src/graphs/primitives/Graph'
import { PriceOracle } from '../../src/modules/PriceOracle/PriceOracle'
import { TgArbitrageNotifier } from '../../src/modules/notification/TgArbitrageNotifier'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { wait } from '../../src/utils/common'
import logger from '../../src/utils/logger'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GraphArbitrageBot', () => {
	const priceOracle = { getPrice: (currency: string) => 1 } as PriceOracle
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
			swapCacheTTL: 50,
		})
	})

	beforeEach(async () => {
		jest.spyOn(GraphExecutor, 'executeEdge').mockImplementation(
			async (edge: Edge) => {
				if (
					edge.actionType === ActionType.STARGATE_BRIDGE ||
					edge.actionType === ActionType.FUSE_BRIDGE
				) {
					await wait(500)
				}
				return {
					amountOut: 10n * 22n,
					srcTxHash: '0x1',
					dstTxHash: '0x1',
				}
			},
		)

		swapWbtcToWethOnFuseRateMock = jest.fn().mockReturnValue(-100)
		swapWethToWbtcOnArbitrumRateMock = jest.fn().mockReturnValue(10)

		for (const [, edge] of graph.edges) {
			if (edge.actionType === ActionType.SWAP) {
				const from = await TokenUtils.fromId(edge.from.id)

				if (from.symbol === 'WETH' && from.chainId === fuse.id) {
					edge.getRate = (amountIn: bigint) => {
						return Promise.resolve({
							amountOut: amountIn / 100n,
							rate: 100,
						})
					}
					continue
				}

				if (from.symbol === 'WBTC' && from.chainId === fuse.id) {
					edge.getRate = (amountIn: bigint) => {
						return Promise.resolve({
							amountOut: amountIn * 100n,
							rate: swapWbtcToWethOnFuseRateMock(),
						})
					}
					continue
				}

				if (from.symbol === 'WETH' && from.chainId === arbitrum.id) {
					edge.getRate = (amountIn: bigint) => {
						return Promise.resolve({
							amountOut: amountIn / 10n,
							rate: swapWethToWbtcOnArbitrumRateMock(),
						})
					}
					continue
				}

				if (from.symbol === 'WBTC' && from.chainId === arbitrum.id) {
					edge.getRate = (amountIn: bigint) => {
						return Promise.resolve({
							amountOut: amountIn * 10n,
							rate: -10,
						})
					}
					continue
				}
			}

			edge.getRate = (amountIn: bigint) => {
				return Promise.resolve({ amountOut: amountIn, rate: 0 })
			}
		}

		bot = new GraphArbitrageBot({
			name: 'Test Bot',
			graph,
			priceOracle,
			TgArbitrageNotifier: notifier,
			startToken: wethWbtcArb.token0, // WBTC arb
		})
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
