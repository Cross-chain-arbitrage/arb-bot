import { maxUint256, TransactionReceipt } from 'viem'
import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Stargate } from '../bridges/stargate/Stargate'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { PriceOracle } from '../modules/PriceOracle/PriceOracle'
import { GraphOptimizer } from '../optimizers/GraphOptimizer'
import { Token } from '../primitives/tokens/Token'
import logger from '../utils/logger'
import { runFuncWithDelay } from '../utils/polling'
import { ActionType, EdgeWithRate, Graph, GraphEdge, GraphNode } from './Graph'
import { GraphExecutor } from './GraphExecutor'
import { ArbitragePath } from './path'
import { getEdgeNodes } from './utils'

const DEFAULT_OPTIONS = {
	minProfitUsd: 3,
	pollingInterval: 10_000,
	arbitrageTimeout: 5 * 60 * 1000,
}

interface GraphArbitrageBotParams {
	graph: Graph
	priceOracle: PriceOracle
	TgArbitrageNotifier: TgArbitrageNotifier
	startToken: GraphNode
	options?: Partial<{
		graphOptimizerOptions: GraphOptimizerOptions
		minProfitUsd: number
		pollingInterval: number
		arbitrageTimeout: number
	}>
}

export class GraphArbitrageBot {
	private isArbitrageExecuting = false
	private TgArbitrageNotifier: TgArbitrageNotifier
	private priceOracle: PriceOracle
	private startToken: GraphNode
	private graph: Graph
	private graphOptimizerOptions: GraphOptimizerOptions
	private minProfitUsd: number
	private pollingInterval: number
	private arbitrageTimeout: number

	constructor(params: GraphArbitrageBotParams) {
		this.TgArbitrageNotifier = params.TgArbitrageNotifier
		this.priceOracle = params.priceOracle
		this.startToken = params.startToken
		this.graph = params.graph
		this.graphOptimizerOptions = params.options?.graphOptimizerOptions || {}
		this.minProfitUsd =
			params.options?.minProfitUsd || DEFAULT_OPTIONS.minProfitUsd
		this.pollingInterval =
			params.options?.pollingInterval || DEFAULT_OPTIONS.pollingInterval
		this.arbitrageTimeout =
			params.options?.arbitrageTimeout || DEFAULT_OPTIONS.arbitrageTimeout
	}

	start() {
		logger.warn('Check that you gave all required token approvals')

		void runFuncWithDelay(
			this.findAndExecuteArbitrage.bind(this),
			this.pollingInterval,
		)
	}

	async findAndExecuteArbitrage() {
		if (this.isArbitrageExecuting) return

		let path
		let edgesWithRate: Map<string, EdgeWithRate>

		try {
			const findOpportunityRes = await GraphOptimizer.findOpportunity(
				this.startToken,
				this.startTokenPrice(),
				this.graph,
				this.graphOptimizerOptions,
			)

			path = findOpportunityRes.path
			edgesWithRate = findOpportunityRes.edgesWithRate
		} catch (err) {
			logger.error(err, 'Error finding arbitrage')
		}

		if (path) {
			const expectedProfitUsd =
				Number(this.startToken.formatUnits(path.profitAmount)) *
				this.startTokenPrice()

			if (expectedProfitUsd < this.minProfitUsd) {
				logger.info(
					`Profit is too low, expectedProfitUsd: $${expectedProfitUsd.toFixed(2)}, minProfitUsd: $${this.minProfitUsd}`,
				)
				return
			}

			try {
				logger.info(
					`Starting arbitrage, start amount: ${this.startToken.formatUnits(path.startAmount)}, expected profit: $${expectedProfitUsd}, expected amountOut: ${this.startToken.formatUnits(path.endAmount)}`,
				)
				this.notifyAboutArbStart(path, edgesWithRate!)

				const { actualAmountOut, actualProfitUsd } =
					await this.execute(path)

				const readableActualAmountOut =
					this.startToken.formatUnits(actualAmountOut)

				logger.info(
					`Arbitrage is finished, amount out: ${readableActualAmountOut}, profit: $${actualProfitUsd}`,
				)
				this.notifyAboutArbEnd(readableActualAmountOut, actualProfitUsd)
			} catch (err) {
				logger.error(err, 'Error executing arbitrage')
				this.notifyAboutArbError(err)
			}
		} else {
			logger.info('No arbitrage found')
		}
	}

	private notifyAboutArbError(error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'

		this.TgArbitrageNotifier.sendArbitrageError(errorMessage).catch(
			(err) => {
				logger.error(err, 'Error sending error to telegram')
			},
		)
	}

	private notifyAboutArbEnd(
		actualAmountOut: string,
		actualProfitUsd: number,
	) {
		this.TgArbitrageNotifier.sendArbitrageEnd(
			actualAmountOut,
			actualProfitUsd,
		).catch((err) => {
			logger.error(err, 'Error sending path to telegram')
		})
	}

	private notifyAboutArbStart(
		path: ArbitragePath,
		edgesWithRate: Map<string, EdgeWithRate>,
	) {
		this.TgArbitrageNotifier.sendArbitrageStart(
			path,
			edgesWithRate,
			this.startTokenPrice(),
		).catch((err) => {
			logger.error(err, 'Error sending path to telegram')
		})
	}

	private async execute(path: ArbitragePath) {
		this.setArbitrageExecutingTrue()

		const actualAmountOut = await GraphExecutor.execute(path)

		const actualProfitUsd =
			(Number(this.startToken.formatUnits(path.startAmount)) -
				Number(this.startToken.formatUnits(actualAmountOut))) *
			this.startTokenPrice()

		this.isArbitrageExecuting = false

		return { actualAmountOut, actualProfitUsd }
	}

	private setArbitrageExecutingTrue() {
		this.isArbitrageExecuting = true
		setTimeout(() => {
			this.isArbitrageExecuting = false
		}, this.arbitrageTimeout)
	}

	async approveAll() {
		for (const edge of this.graph.edges) {
			const { from, to } = await getEdgeNodes(edge)

			logger.info(
				`approving for edge ${edge.type} ${from.chainId}:${from.symbol} - ${to.chainId}:${to.symbol}`,
			)
			const tx = await this.approveForEdge(edge)

			if (!tx) {
				logger.info('Approve already done')
			} else {
				logger.info(tx?.transactionHash)
			}
		}
	}

	private async approveForEdge(
		edge: GraphEdge,
	): Promise<TransactionReceipt | undefined> {
		const { from } = await getEdgeNodes(edge)

		switch (edge.type) {
			case ActionType.SWAP:
				return await (from as Token).approve(
					edge.pool.routerAddress,
					maxUint256,
				)

			case ActionType.STARGATE_BRIDGE:
				return await Stargate.approveToBridge(from, maxUint256)

			case ActionType.FUSE_BRIDGE:
				return await FuseBridge.approveToBridge(from, maxUint256)
		}
	}

	private startTokenPrice() {
		return this.priceOracle.getPrice(
			this.startToken
				.symbol as keyof typeof this.priceOracle.currencyToUCID,
		)
	}
}
