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

const DEFAULT_SETTINGS = {
	arbitrageTimeout: 5 * 60 * 1000,
	retryExecuteEdgeCount: 2,
	maxExecutionErrorsInARow: 3,
}

type BotSettings = Readonly<{
	minProfitUsd: number
	pollingInterval: number
	/** Timeout in milliseconds after which arbitrage execution is considered failed and reset */
	arbitrageTimeout?: number
	retryExecuteEdgeCount?: number
	maxExecutionErrorsInARow?: number
}>

export class GraphArbitrageBot {
	private isArbitrageExecuting = false
	private executionErrorInARow = 0
	readonly settings: Required<BotSettings>

	constructor(
		readonly name: string,
		readonly TgArbitrageNotifier: TgArbitrageNotifier,
		readonly graphParams: Readonly<{
			graph: Graph
			startToken: GraphNode
			graphOptimizerOptions: GraphOptimizerOptions
		}>,
		settings: BotSettings,
	) {
		this.settings = { ...DEFAULT_SETTINGS, ...settings }
	}

	start() {
		logger.warn('Check that you gave all required token approvals')

		let message = `${this.name} started\n\nGraph:\n`

		const { view, edit } = GraphVisualizer.getLinksToMermaidGraph(
			this.graphParams.graph,
		)

		const viewLink = `\x1b]8;;${view}\x1b\\📊 View Graph\x1b]8;;\x1b\\`
		const editLink = `\x1b]8;;${edit}\x1b\\✏️ Edit Graph\x1b]8;;\x1b\\`

		logger.info(`Graph links: ${viewLink} | ${editLink}`)

		message += `<a href="${view}">📊 View Graph</a> | <a href="${edit}">✏️ Edit Graph</a>\n\n`

		this.TgArbitrageNotifier.sendMessage(message).catch((err) => {
			logger.error(err, 'Error sending message to telegram')
		})

		void runFuncWithDelay(async () => {
			await this.findAndExecuteArbitrage()
			this.firstRunCheck()
		}, this.settings.pollingInterval)
	}

	async findArbitrage() {
		try {
			const findOpportunityRes = await GraphOptimizer.findOpportunity(
				this.graphParams.startToken,
				await this.startTokenPrice(),
				this.graphParams.graph,
				this.graphParams.graphOptimizerOptions,
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

			return null
		}
	}

	async executeArbitrage(opportunity: GraphArbitrageOpportunity) {
		try {
			const prettyOpportunity = GraphVisualizer.getPrettyOpportunity(
				opportunity,
				await this.startTokenPrice(),
			)
			logger.info(prettyOpportunity)
			this.notifyAboutArbStart(prettyOpportunity)

			const { endAmount, revenue, executionCostInUsd } =
				await this.execute(opportunity)

			const readableActualAmountOut =
				this.graphParams.startToken.formatUnits(endAmount)

			logger.info(
				`Arbitrage is finished, amount out: ${readableActualAmountOut}, revenue: $${revenue}, execution cost: $${executionCostInUsd}`,
			)
			this.notifyAboutArbEnd(
				executionCostInUsd,
				endAmount,
				opportunity,
			).catch((err) => {
				logger.error(err, 'Error sending path to telegram')
			})
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

	async checkOpportunity(
		opportunity: GraphArbitrageOpportunity | null,
	): Promise<boolean> {
		if (!opportunity || !opportunity.path) {
			logger.info('No arbitrage found')
			return false
		}

		const expectedProfitUsd = await this.calculateRevenue(
			opportunity.startAmount,
			opportunity.endAmount,
		)

		if (expectedProfitUsd < this.settings.minProfitUsd) {
			logger.info(
				`Profit is too low, expectedProfitUsd: $${expectedProfitUsd.toFixed(2)}, minProfitUsd: $${this.settings.minProfitUsd}`,
			)
			return false
		}

		return true
	}

	async findAndExecuteArbitrage() {
		if (this.isArbitrageExecuting) return

		const arbitrageOpportunity = await this.findArbitrage()

		const isOpportunityValid =
			await this.checkOpportunity(arbitrageOpportunity)

		if (!isOpportunityValid) return

		await this.executeArbitrage(arbitrageOpportunity!)
	}

	private isFirstRun = true
	/**
	 * Check that rates are correct after first run
	 */
	private firstRunCheck() {
		if (!this.isFirstRun) return

		try {
			const { view, edit } = GraphVisualizer.getLinksToMermaidGraph(
				this.graphParams.graph,
			)

			const viewLink = `\x1b]8;;${view}\x1b\\📊 View Graph\x1b]8;;\x1b\\`
			const editLink = `\x1b]8;;${edit}\x1b\\✏️ Edit Graph\x1b]8;;\x1b\\`

			logger.info(
				`Graph with rates after first run: ${viewLink} | ${editLink}`,
			)
		} catch (error) {
			logger.error(error, 'Error checking first run')
		} finally {
			this.isFirstRun = false
		}
	}

	private notifyAboutArbError(error: unknown) {
		if (
			this.executionErrorInARow++ > this.settings.maxExecutionErrorsInARow
		) {
			logger.warn(
				'Too many execution errors in a row, skipping notification',
			)
			return
		}

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'

		this.TgArbitrageNotifier.sendArbitrageError(
			this.name,
			errorMessage,
			this.executionErrorInARow >
				this.settings.maxExecutionErrorsInARow - 1,
		).catch((err) => {
			logger.error(err, 'Error sending error to telegram')
		})
	}

	private async notifyAboutArbEnd(
		executionCostInUsd: number,
		actualAmountOut: bigint,
		opportunity: GraphArbitrageOpportunity,
	) {
		this.executionErrorInARow = 0

		const price = await this.startTokenPrice()

		this.TgArbitrageNotifier.sendArbitrageEnd(
			this.name,
			executionCostInUsd,
			actualAmountOut,
			opportunity,
			price,
		).catch((err) => {
			logger.error(err, 'Error sending path to telegram')
		})
	}

	private notifyAboutArbStart(prettyOpportunity: string) {
		this.TgArbitrageNotifier.sendArbitrageStart(
			this.name,
			prettyOpportunity,
		).catch((err) => {
			logger.error(err, 'Error sending path to telegram')
		})
	}

	async execute(graphArbitrageOpportunity: GraphArbitrageOpportunity) {
		this.setArbitrageExecutingTrue()

		const { path, startAmount } = graphArbitrageOpportunity

		const { actualEndAmount, totalTxsCostInUsd } =
			await GraphExecutor.execute({
				path,
				startAmount,
				beforeExecuteEdgeHook: this.checkEdgeProfitability.bind(this),
				retryExecuteEdgeCount: this.settings.retryExecuteEdgeCount,
			})

		const revenue = await this.calculateRevenue(
			startAmount,
			actualEndAmount,
		)

		this.isArbitrageExecuting = false

		return {
			endAmount: actualEndAmount,
			revenue,
			executionCostInUsd: totalTxsCostInUsd,
		}
	}

	private async calculateRevenue(amountStart: bigint, amountEnd: bigint) {
		const amountEndFormatted = Number(
			this.graphParams.startToken.formatUnits(amountEnd),
		)

		const amountStartFormatted = Number(
			this.graphParams.startToken.formatUnits(amountStart),
		)

		const startTokenPrice = await this.startTokenPrice()

		return (amountEndFormatted - amountStartFormatted) * startTokenPrice
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

		if (fromToken.chainId === this.graphParams.startToken.chainId) return

		const currentRate = await currentEdge.getRate(amountIn)

		let distance = 0

		for (const edge of path) {
			if (edge.from === currentEdge.from && edge.to === currentEdge.to) {
				distance += currentRate.rate
			} else {
				distance += edge.lastQuote!.rate
			}
		}

		if (distance < 0) return

		throw new Error(`Profitability check failed, distance: ${distance}`)
	}

	private setArbitrageExecutingTrue() {
		this.isArbitrageExecuting = true
		setTimeout(() => {
			this.isArbitrageExecuting = false
		}, this.settings.arbitrageTimeout)
	}

	async approveAll() {
		for (const [edgeId, edge] of this.graphParams.graph.edges) {
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
				return await (from as Token).approveInfinite(
					(edge as SwapEdge).pool.routerAddress,
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

	private async startTokenPrice() {
		return PriceOracle.getPrice(this.graphParams.startToken)
	}
}
