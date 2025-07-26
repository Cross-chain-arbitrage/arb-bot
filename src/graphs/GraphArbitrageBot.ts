import { Logger } from 'nestjs-pino'
import {
	ContractFunctionExecutionError,
	maxUint256,
	TransactionReceipt,
} from 'viem'
import { FuseBridgeService } from '../bridges/layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { StargateService } from '../bridges/layerzero-bridges/stargate/stargate-service'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { PriceOracleService } from '../modules/price-oracle/price-oracle.service'
import { GraphOptimizer } from '../optimizers/GraphOptimizer'
import { Token } from '../primitives/tokens/Token'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'
import { runFuncWithDelay } from '../utils/polling'
import { GraphExecutor } from './GraphExecutor'
import { GraphVisualizer } from './GraphVisualizer'
import { ActionType, Edge, SwapEdge } from './primitives/Edge'
import { Graph } from './primitives/Graph'

const DEFAULT_SETTINGS = {
	dryRun: false,
	arbitrageTimeout: 5 * 60 * 1000,
	retryExecuteEdgeCount: 2,
	maxExecutionErrorsInARow: 3,
}

type BotSettings = Readonly<{
	dryRun?: boolean
	minProfitUsd: number
	opportunityCheckInterval: number
	/** Timeout in milliseconds after which arbitrage execution is considered failed and reset */
	arbitrageExecutionTimeout: number
	retryExecuteEdgeCount?: number
	maxExecutionErrorsInARow?: number
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
		readonly chainClientService: ChainClientService,
		readonly graphVisualizer: GraphVisualizer,
		readonly tokenUtils: TokenUtils,
		readonly stargate: StargateService,
		readonly fuseBridge: FuseBridgeService,
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
			this.logger.log(prettyOpportunity)

			if (this.settings.dryRun) {
				this.logger.log('Dry run, skipping execution')
				return
			}

			this.notifyAboutArbStart(prettyOpportunity)

			const { endAmount, revenue, executionCostInUsd } =
				await this.execute(opportunity)

			const readableActualAmountOut =
				this.graphParams.startToken.formatUnits(endAmount)

			this.logger.log(
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
			this.logger.log('No arbitrage found')
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
			this.logger.log(
				`Revenue is too low, expectedRevenue: $${expectedRevenue.toFixed(2)}, minProfitUsd: $${this.settings.minProfitUsd}`,
			)
			return false
		}

		let executionCostInUsd = 0

		for (const edge of opportunity.path) {
			executionCostInUsd += await this.calculateEdgeExecutionCost(edge)
		}

		const expectedProfit = expectedRevenue - executionCostInUsd

		if (expectedProfit < this.settings.minProfitUsd) {
			this.logger.log(
				`Profit is too low, expectedProfit: $${expectedProfit.toFixed(2)}, minProfitUsd: $${this.settings.minProfitUsd}`,
			)
			return false
		}

		return true
	}

	async calculateEdgeExecutionCost(edge: Edge) {
		let executionCostInUsd = 0

		const nativeOnFromChain = this.tokenUtils.getNative(edge.from.chainId)
		const nativePrice =
			await this.priceOracleService.getPrice(nativeOnFromChain)
		const gasPrice = await this.chainClientService
			.getClient(edge.from.chainId)
			.getGasPrice()

		const txCostInUsd =
			Number(
				nativeOnFromChain.formatUnits(
					gasPrice * edge.lastQuote!.cost.gas,
				),
			) * nativePrice

		// TODO: refactor! Relay returns already calculated gas * gasPrice
		if (edge.actionType === ActionType.RELAY_BRIDGE) {
			executionCostInUsd += Number(edge.lastQuote!.cost.gas) * nativePrice
		} else {
			executionCostInUsd += txCostInUsd
		}

		if (
			edge.actionType === ActionType.STARGATE_BRIDGE ||
			edge.actionType === ActionType.FUSE_BRIDGE ||
			edge.actionType === ActionType.SIMPLE_STARGATE_BRIDGE
		) {
			const bridgeFee = (
				edge.lastQuote!.cost as EdgeExecutionCost<BridgeActionType>
			).bridgeFee

			const tokenPrice = await this.priceOracleService.getPrice(
				bridgeFee.underlyingToken,
			)

			const txCostInUsd =
				Number(
					bridgeFee.underlyingToken.formatUnits(bridgeFee.amount),
				) * tokenPrice

			executionCostInUsd += txCostInUsd
		}

		return executionCostInUsd
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
		if (
			this.executionErrorInARow++ > this.settings.maxExecutionErrorsInARow
		) {
			this.logger.warn(
				'Too many execution errors in a row, skipping notification',
			)
			return
		}

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'

		const startTokenPrice = await this.startTokenPrice()

		this.TgArbitrageNotifier.sendArbitrageError(
			this.botName,
			errorMessage,
			this.executionErrorInARow >
				this.settings.maxExecutionErrorsInARow - 1,
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
		}, this.settings.arbitrageExecutionTimeout)
	}

	async approveAll() {
		for (const [edgeId, edge] of this.graphParams.graph.edges) {
			const { from, to } = edge

			this.logger.log(
				`approving for edge ${edge.actionType} ${from.chainId}:${from.symbol} - ${to.chainId}:${to.symbol}`,
			)
			const tx = await this.approveForEdge(edge)

			if (!tx) {
				this.logger.log('Approve already done')
			} else {
				this.logger.log(tx?.transactionHash)
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
				return await this.stargate.approveToBridge(from, maxUint256)

			case ActionType.FUSE_BRIDGE:
				return await this.fuseBridge.approveToBridge(
					from,
					maxUint256,
					to.chainId,
				)
		}
	}

	private async startTokenPrice() {
		return this.priceOracleService.getPrice(this.graphParams.startToken)
	}
}
