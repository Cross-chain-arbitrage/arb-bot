import {
	ContractFunctionExecutionError,
	maxUint256,
	TransactionReceipt,
} from 'viem'
import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Stargate } from '../bridges/stargate/Stargate'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { PriceOracle } from '../modules/PriceOracle/PriceOracle'
import { GraphOptimizer } from '../optimizers/GraphOptimizer'
import { Token } from '../primitives/tokens/Token'
import logger from '../utils/logger'
import { runFuncWithDelay } from '../utils/polling'
import { GraphExecutor } from './GraphExecutor'
import { GraphVisualizer } from './GraphVisualizer'
import { ActionType, Edge, SwapEdge } from './primitives/Edge'
import { Graph } from './primitives/Graph'

const DEFAULT_OPTIONS = {
	minProfitUsd: 3,
	pollingInterval: 10_000,
	arbitrageTimeout: 5 * 60 * 1000,
	retryExecuteEdgeCount: 2,
}

interface GraphArbitrageBotParams {
	name: string
	graph: Graph
	priceOracle: PriceOracle
	TgArbitrageNotifier: TgArbitrageNotifier
	startToken: GraphNode
	options?: Partial<{
		graphOptimizerOptions: GraphOptimizerOptions
		minProfitUsd: number
		pollingInterval: number
		arbitrageTimeout: number
		retryExecuteEdgeCount: number
	}>
}

export class GraphArbitrageBot {
	private isArbitrageExecuting = false
	readonly TgArbitrageNotifier: TgArbitrageNotifier
	readonly priceOracle: PriceOracle
	readonly startToken: GraphNode
	readonly graph: Graph
	readonly graphOptimizerOptions: GraphOptimizerOptions
	readonly minProfitUsd: number
	readonly pollingInterval: number
	readonly arbitrageTimeout: number
	readonly retryExecuteEdgeCount: number
	readonly name: string
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
		this.retryExecuteEdgeCount =
			params.options?.retryExecuteEdgeCount ||
			DEFAULT_OPTIONS.retryExecuteEdgeCount
		this.name = params.name
	}

	start() {
		logger.warn('Check that you gave all required token approvals')

		let message = `${this.name} started\n\nGraph:\n`

		const { view, edit } = GraphVisualizer.getLinksToMermaidGraph(
			this.graph,
		)

		// Создаем скрытые ссылки с помощью ANSI escape последовательностей
		const viewLink = `\x1b]8;;${view}\x1b\\📊 View Graph\x1b]8;;\x1b\\`
		const editLink = `\x1b]8;;${edit}\x1b\\✏️ Edit Graph\x1b]8;;\x1b\\`

		logger.info(`Graph links: ${viewLink} | ${editLink}`)

		message += `<a href="${view}">📊 View Graph</a> | <a href="${edit}">✏️ Edit Graph</a>\n\n`

		this.TgArbitrageNotifier.sendMessage(message).catch((err) => {
			logger.error(err, 'Error sending message to telegram')
		})

		void runFuncWithDelay(
			this.findAndExecuteArbitrage.bind(this),
			this.pollingInterval,
		)
	}

	async findArbitrage() {
		try {
			const findOpportunityRes = await GraphOptimizer.findOpportunity(
				this.startToken,
				this.startTokenPrice(),
				this.graph,
				this.graphOptimizerOptions,
			)

			return findOpportunityRes
		} catch (err) {
			if (err instanceof ContractFunctionExecutionError) {
				const shortenedError = new ContractFunctionExecutionError(
					err.cause,
					{
						abi: [],
						args: err.args,
						functionName: err.functionName,
						contractAddress: err.contractAddress,
						sender: err.sender,
					},
				)
				logger.error(shortenedError, 'Error finding arbitrage')
			} else {
				logger.error(err, 'Error finding arbitrage')
			}
		}
	}

	async executeArbitrage(path: GraphArbitrageOpportunity) {
		const expectedProfitUsd =
			Number(this.startToken.formatUnits(path.profitAmount)) *
			this.startTokenPrice()

		try {
			logger.info(
				`Starting arbitrage, start amount: ${this.startToken.formatUnits(path.startAmount)}, expected profit: $${expectedProfitUsd}, expected amountOut: ${this.startToken.formatUnits(path.endAmount)}`,
			)
			this.notifyAboutArbStart(path)

			const { actualAmountOut, actualProfitUsd } =
				await this.execute(path)

			const readableActualAmountOut =
				this.startToken.formatUnits(actualAmountOut)

			logger.info(
				`Arbitrage is finished, amount out: ${readableActualAmountOut}, profit: $${actualProfitUsd}`,
			)
			this.notifyAboutArbEnd(readableActualAmountOut, actualProfitUsd)
		} catch (err) {
			if (err instanceof ContractFunctionExecutionError) {
				const shortenedError = new ContractFunctionExecutionError(
					err.cause,
					{
						abi: [],
						args: err.args,
						functionName: err.functionName,
						contractAddress: err.contractAddress,
						sender: err.sender,
					},
				)
				logger.error(shortenedError, 'Error executing arbitrage')
			} else {
				logger.error(err, 'Error executing arbitrage')
			}
			this.notifyAboutArbError(err)
		}
	}

	async findAndExecuteArbitrage() {
		if (this.isArbitrageExecuting) return

		const arbitrageOpportunity = await this.findArbitrage()

		if (!arbitrageOpportunity || !arbitrageOpportunity.path) {
			logger.info('No arbitrage found')
			return
		}

		const expectedProfitUsd =
			Number(
				this.startToken.formatUnits(arbitrageOpportunity.profitAmount),
			) * this.startTokenPrice()

		if (expectedProfitUsd < this.minProfitUsd) {
			logger.info(
				`Profit is too low, expectedProfitUsd: $${expectedProfitUsd.toFixed(2)}, minProfitUsd: $${this.minProfitUsd}`,
			)
			return
		}

		await this.executeArbitrage(arbitrageOpportunity)
	}

	private notifyAboutArbError(error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'

		this.TgArbitrageNotifier.sendArbitrageError(
			this.name,
			errorMessage,
		).catch((err) => {
			logger.error(err, 'Error sending error to telegram')
		})
	}

	private notifyAboutArbEnd(
		actualAmountOut: string,
		actualProfitUsd: number,
	) {
		this.TgArbitrageNotifier.sendArbitrageEnd(
			this.name,
			actualAmountOut,
			actualProfitUsd,
		).catch((err) => {
			logger.error(err, 'Error sending path to telegram')
		})
	}

	private notifyAboutArbStart(path: GraphArbitrageOpportunity) {
		this.TgArbitrageNotifier.sendArbitrageStart(
			this.name,
			path,
			this.startTokenPrice(),
		).catch((err) => {
			logger.error(err, 'Error sending path to telegram')
		})
	}

	async execute(graphArbitrageOpportunity: GraphArbitrageOpportunity) {
		this.setArbitrageExecutingTrue()

		const { path, startAmount } = graphArbitrageOpportunity

		const actualAmountOut = await GraphExecutor.execute({
			path,
			startAmount,
			beforeExecuteEdgeHook: this.checkEdgeProfitability.bind(this),
			retryExecuteEdgeCount: this.retryExecuteEdgeCount,
		})

		const actualProfitUsd =
			(Number(this.startToken.formatUnits(startAmount)) -
				Number(this.startToken.formatUnits(actualAmountOut))) *
			this.startTokenPrice()

		this.isArbitrageExecuting = false

		return { actualAmountOut, actualProfitUsd }
	}

	/**
	 * Throw error if distance becomes non-negative after receiving new rate for swap on non-start token chain
	 */
	private async checkEdgeProfitability(
		path: Edge[],
		currentEdge: Edge,
		amountIn: bigint,
	) {
		if (currentEdge.actionType !== ActionType.SWAP) return

		const fromToken = currentEdge.from

		if (fromToken.chainId === this.startToken.chainId) return

		const currentRate = await currentEdge.getRate(amountIn)

		let distance = 0

		for (const edge of path) {
			if (edge.from === currentEdge.from && edge.to === currentEdge.to) {
				distance += currentRate.rate
			} else {
				distance += edge.lastRate!
			}
		}

		if (distance < 0) return

		throw new Error(`Profitability check failed, distance: ${distance}`)
	}

	private setArbitrageExecutingTrue() {
		this.isArbitrageExecuting = true
		setTimeout(() => {
			this.isArbitrageExecuting = false
		}, this.arbitrageTimeout)
	}

	async approveAll() {
		for (const [edgeId, edge] of this.graph.edges) {
			const { from, to } = edge

			logger.info(
				`approving for edge ${edge.actionType} ${from.chainId}:${from.symbol} - ${to.chainId}:${to.symbol}`,
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
		edge: Edge,
	): Promise<TransactionReceipt | undefined> {
		const { from, to } = edge

		switch (edge.actionType) {
			case ActionType.SWAP:
				return await (from as Token).approve(
					(edge as SwapEdge).pool.routerAddress,
					maxUint256,
				)

			case ActionType.STARGATE_BRIDGE:
				return await Stargate.approveToBridge(from, maxUint256)

			case ActionType.FUSE_BRIDGE:
				return await FuseBridge.approveToBridge(
					from,
					maxUint256,
					to.chainId,
				)
		}
	}

	private startTokenPrice() {
		return this.priceOracle.getPrice(
			this.startToken
				.symbol as keyof typeof this.priceOracle.currencyToUCID,
		)
	}
}
