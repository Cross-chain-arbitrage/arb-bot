import { Logger } from '@nestjs/common'
import { ContractFunctionExecutionError } from 'viem'
import {
	OpportunityLog,
	OpportunityLogType,
	SuccessExecutionOpportunityLog,
} from '../logging/OpportunityLog'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { PriceOracleService } from '../modules/price-oracle/price-oracle.service'
import { GraphOptimizer } from '../optimizers/GraphOptimizer'
import { runFuncWithDelay } from '../utils/polling'
import { GraphExecutor } from './GraphExecutor'
import { GraphVisualizer } from './GraphVisualizer'
import { Edge } from './primitives/edges/edge'
import { SwapEdge } from './primitives/edges/inchain/swap-edge'
import { Graph } from './primitives/Graph'

const DEFAULT_SETTINGS = {
	dryRun: false,
	arbitrageTimeout: 5 * 60 * 1000,
	retryExecuteEdgeCount: 2,
}

type BotSettings = Readonly<{
	dryRun: boolean
	minProfitUsd: number
	opportunityCheckInterval: number
	/** Timeout in milliseconds after which arbitrage execution is considered failed and reset */
	arbitrageExecutionTimeout: number
	retryExecuteEdgeCount?: number
}>

export class GraphArbitrageBot {
	private isArbitrageExecuting = false
	private executionErrorInARow = 0
	readonly settings: Required<BotSettings>

	constructor(
		readonly botName: string,
		readonly TgArbitrageNotifier: TgArbitrageNotifier,
		readonly graphParams: Readonly<{
			graph: Graph
			startToken: GraphNode
			graphOptimizerOptions: GraphOptimizerOptions
		}>,
		settings: BotSettings,
		readonly graphVisualizer: GraphVisualizer,
		readonly graphExecutor: GraphExecutor,
		readonly priceOracleService: PriceOracleService,
		readonly logger: Logger,
	) {
		this.settings = { ...DEFAULT_SETTINGS, ...settings }
	}

	start() {
		this.logger.warn('Check that you gave all required token approvals')

		let message = `${this.botName} started\n\nGraph:\n`

		const { view, edit } = this.graphVisualizer.getLinksToMermaidGraph(
			this.graphParams.graph,
		)

		const viewLink = `\x1b]8;;${view}\x1b\\📊 View Graph\x1b]8;;\x1b\\`
		const editLink = `\x1b]8;;${edit}\x1b\\✏️ Edit Graph\x1b]8;;\x1b\\`

		this.logger.log(`Graph links: ${viewLink} | ${editLink}`)

		message += `<a href="${view}">📊 View Graph</a> | <a href="${edit}">✏️ Edit Graph</a>\n\n`

		this.TgArbitrageNotifier.sendMessage(message).catch((err) => {
			this.logger.error(err, 'Error sending message to telegram')
		})

		if (this.settings.dryRun) {
			this.logger.log('This Arbitrage Bot is in dry run mode')
		}

		void runFuncWithDelay(async () => {
			await this.findAndExecuteArbitrage()
			this.firstRunCheck()
		}, this.settings.opportunityCheckInterval)
	}

	async findArbitrage() {
		try {
			const findOpportunityRes = await GraphOptimizer.findOpportunity(
				this.graphParams.startToken,
				await this.startTokenPrice(),
				this.graphParams.graph,
				this.graphParams.graphOptimizerOptions,
				this.logger,
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
				this.logger.error(shortenedError, 'Error finding arbitrage')
			} else {
				this.logger.error(err, 'Error finding arbitrage')
			}

			return null
		}
	}

	async executeArbitrage(opportunity: GraphArbitrageOpportunity) {
		try {
			const prettyOpportunity = this.graphVisualizer.getPrettyOpportunity(
				opportunity,
				await this.startTokenPrice(),
			)
			await this.logProfitableOpp(opportunity, 'Arbitrage found')
			this.notifyAboutArbStart(prettyOpportunity)

			if (this.settings.dryRun) {
				this.logger.log('Dry run, skipping execution')
				return
			}

			const { endAmount, revenue, executionCostInUsd } =
				await this.execute(opportunity)

			const readableActualAmountOut =
				this.graphParams.startToken.formatUnits(endAmount)

			await this.logSuccessExecutionOpp(
				opportunity,
				endAmount,
				executionCostInUsd,
				`Arbitrage is finished, amount out: ${readableActualAmountOut}, revenue: $${revenue}, execution cost: $${executionCostInUsd}`,
			)

			this.notifyAboutArbEnd(
				executionCostInUsd,
				endAmount,
				opportunity,
			).catch((err) => {
				this.logger.error(err, 'Error sending path to telegram')
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
				this.logger.error(shortenedError, 'Error executing arbitrage')
			} else {
				this.logger.error(err, 'Error executing arbitrage')
			}
			this.notifyAboutArbError(err, opportunity).catch((err) => {
				this.logger.error(err, 'Error sending error to telegram')
			})
		}
	}

	async checkOpportunity(
		opportunity: GraphArbitrageOpportunity | null,
	): Promise<boolean> {
		if (!opportunity || !opportunity.path) {
			await this.logAbsenceOfArbitrage('No arbitrage found')
			return false
		}

		const expectedRevenue = await this.calculateRevenue(
			opportunity.startAmount,
			opportunity.endAmount,
		)

		if (expectedRevenue < 0) {
			this.logger.warn(
				opportunity,
				`Revenue is negative, expectedRevenue: $${expectedRevenue.toFixed(2)}`,
			)
			return false
		}

		if (expectedRevenue < this.settings.minProfitUsd) {
			await this.logSkippedOpp(
				opportunity,
				`Revenue is too low, expectedRevenue: $${expectedRevenue.toFixed(2)}, minProfitUsd: $${this.settings.minProfitUsd}`,
			)
			return false
		}

		let executionCostInUsd = 0

		for (const edge of opportunity.path) {
			executionCostInUsd += edge.lastQuote!.costInUsd
		}

		this.logger.log(`Execution cost: $${executionCostInUsd.toFixed(2)}`)

		const expectedProfit = expectedRevenue - executionCostInUsd

		if (expectedProfit < this.settings.minProfitUsd) {
			await this.logSkippedOpp(
				opportunity,
				`Profit is too low, expectedProfit: $${expectedProfit.toFixed(2)}, minProfitUsd: $${this.settings.minProfitUsd}`,
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
			const { view, edit } = this.graphVisualizer.getLinksToMermaidGraph(
				this.graphParams.graph,
			)

			const viewLink = `\x1b]8;;${view}\x1b\\📊 View Graph\x1b]8;;\x1b\\`
			const editLink = `\x1b]8;;${edit}\x1b\\✏️ Edit Graph\x1b]8;;\x1b\\`

			this.logger.log(
				`Graph with rates after first run: ${viewLink} | ${editLink}`,
			)
		} catch (error) {
			this.logger.error(error, 'Error checking first run')
		} finally {
			this.isFirstRun = false
		}
	}

	private async notifyAboutArbError(
		error: unknown,
		opportunity: GraphArbitrageOpportunity,
	) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'

		const startTokenPrice = await this.startTokenPrice()

		this.TgArbitrageNotifier.sendArbitrageError(
			this.botName,
			errorMessage,
			opportunity,
			startTokenPrice,
		).catch((err) => {
			this.logger.error(err, 'Error sending error to telegram')
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
			this.botName,
			executionCostInUsd,
			actualAmountOut,
			opportunity,
			price,
		).catch((err) => {
			this.logger.error(err, 'Error sending path to telegram')
		})
	}

	private notifyAboutArbStart(prettyOpportunity: string) {
		this.TgArbitrageNotifier.sendArbitrageStart(
			this.botName,
			prettyOpportunity,
		).catch((err) => {
			this.logger.error(err, 'Error sending path to telegram')
		})
	}

	async execute(graphArbitrageOpportunity: GraphArbitrageOpportunity) {
		this.setArbitrageExecutingTrue()

		const { path, startAmount } = graphArbitrageOpportunity

		const { actualEndAmount, totalTxsCostInUsd } =
			await this.graphExecutor.execute({
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
		if (!(currentEdge instanceof SwapEdge)) return

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
		}, this.settings.arbitrageExecutionTimeout)
	}

	async approveAll() {
		for (const [, edge] of this.graphParams.graph.edges) {
			const { from, to } = edge

			this.logger.log(
				`approving for edge ${edge.constructor.name} ${from.chainId}:${from.symbol} - ${to.chainId}:${to.symbol}`,
			)
			const txs = await edge.approve()

			if (!txs || txs.length === 0) {
				this.logger.log('Approve already done or not required')
			} else {
				this.logger.log(txs)
			}
		}
	}

	private async startTokenPrice() {
		return this.priceOracleService.getPrice(this.graphParams.startToken)
	}

	async logSkippedOpp(
		arbitrageOpportunity: GraphArbitrageOpportunity,
		msg: string,
	) {
		await this.logOpportunity(arbitrageOpportunity, 'skipped', msg)
	}

	async logProfitableOpp(
		arbitrageOpportunity: GraphArbitrageOpportunity,
		msg: string,
	) {
		await this.logOpportunity(arbitrageOpportunity, 'success-finding', msg)
	}

	async logAbsenceOfArbitrage(msg: string) {
		await this.logOpportunity(
			{
				path: [],
				startAmount: 0n,
				endAmount: 0n,
				profitAmount: 0n,
				profitPercentage: 0,
			},
			'no-arbitrage',
			msg,
		)
	}

	async logSuccessExecutionOpp(
		arbitrageOpportunity: GraphArbitrageOpportunity,
		actualAmountOut: bigint,
		executionTime: number,
		msg: string,
	) {
		const profit = actualAmountOut - arbitrageOpportunity.startAmount
		const actualProfitUsd =
			Number(this.graphParams.startToken.formatUnits(profit)) *
			(await this.startTokenPrice())

		const readableProfitAmount = Number(
			this.graphParams.startToken.formatUnits(profit),
		)

		const log: SuccessExecutionOpportunityLog = {
			type: 'success-execution',
			module: 'opportunity-finder',
			profitAmount: profit.toString(),
			profitAmountUsd: actualProfitUsd,
			readableProfitAmount,
			amountIn: arbitrageOpportunity.startAmount.toString(),
			amountOut: actualAmountOut.toString(),
			path: arbitrageOpportunity.path.map((edge) => edge.id),
			executionTime,
		}

		this.logger.log(log, msg)
	}

	async logOpportunity(
		opportunity: GraphArbitrageOpportunity,
		type: OpportunityLogType,
		msg: string,
	) {
		const expectedProfitUsd =
			opportunity.profitAmount > 0n
				? Number(
						this.graphParams.startToken.formatUnits(
							opportunity.profitAmount,
						),
					) * (await this.startTokenPrice())
				: 0

		const readableProfitAmount = Number(
			this.graphParams.startToken.formatUnits(opportunity.profitAmount),
		)

		const log: OpportunityLog = {
			type,
			module: 'opportunity-finder',
			profitAmount: opportunity.profitAmount.toString(),
			profitAmountUsd: expectedProfitUsd,
			readableProfitAmount,
			amountIn: opportunity.startAmount.toString(),
			amountOut: opportunity.endAmount.toString(),
			path: opportunity.path.map((edge) => edge.id),
		}

		this.logger.log(log, msg)
	}
}
