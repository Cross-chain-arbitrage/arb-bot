import { maxUint256, TransactionReceipt } from 'viem'
import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Stargate } from '../bridges/stargate/Stargate'
import { GraphOptimizer } from '../optimizers/GraphOptimizer'
import { Token } from '../primitives/tokens/Token'
import logger from '../utils/logger'
import { runFuncWithDelay } from '../utils/polling'
import { ActionType, Graph, GraphEdge, GraphNode } from './Graph'
import { GraphExecutor } from './GraphExecutor'
import { ArbitragePath } from './path'
import { getEdgeNodes } from './utils'

export class GraphArbitrageBot {
	private _startTokenPrice: number
	private isArbitrageExecuting = false

	constructor(
		readonly startToken: GraphNode,
		readonly graph: Graph,
		readonly graphOptimizerOptions: GraphOptimizerOptions,
		startTokenPrice: number,
		readonly minProfitUsd = 3,
		readonly pollingInterval = 10_000,
		readonly arbitrageTimeout = 5 * 60 * 1000,
	) {
		this._startTokenPrice = startTokenPrice
	}

	updateStartTokenPrice(startTokenPrice: number) {
		this._startTokenPrice = startTokenPrice
	}

	get startTokenPrice() {
		return this._startTokenPrice
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

		try {
			const findOpportunityRes = await GraphOptimizer.findOpportunity(
				this.startToken,
				this.startTokenPrice,
				this.graph,
				this.graphOptimizerOptions,
			)

			path = findOpportunityRes.path
		} catch (err) {
			logger.error(err, 'Error finding arbitrage')
		}

		if (path) {
			const expectedProfitUsd =
				Number(this.startToken.formatUnits(path.profitAmount)) *
				this.startTokenPrice

			if (expectedProfitUsd < this.minProfitUsd) {
				logger.info(
					`Profit is too low, expectedProfitUsd: $${expectedProfitUsd.toFixed(2)}, minProfitUsd: $${this.minProfitUsd}`,
				)
				return
			}

			try {
				await this.execute(path, expectedProfitUsd)
			} catch (err) {
				logger.error(err, 'Error executing arbitrage')
			}
		} else {
			logger.info('No arbitrage found')
		}
	}

	private async execute(path: ArbitragePath, expectedProfitUsd: number) {
		logger.info(
			`Starting arbitrage, start amount: ${this.startToken.formatUnits(path.startAmount)}, expected profit: $${expectedProfitUsd}, expected amountOut: ${this.startToken.formatUnits(path.endAmount)}`,
		)

		this.setArbitrageExecutingTrue()

		const actualAmountOut = await GraphExecutor.execute(path)

		const actualProfitUsd =
			(Number(this.startToken.formatUnits(path.startAmount)) -
				Number(this.startToken.formatUnits(actualAmountOut))) *
			this.startTokenPrice

		logger.info(
			`Arbitrage is finished, amount out: ${this.startToken.formatUnits(actualAmountOut)}, profit: $${actualProfitUsd}`,
		)

		this.isArbitrageExecuting = false
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

			console.log(
				`approving for edge ${edge.type} ${from.chainId}:${from.symbol} - ${to.chainId}:${to.symbol}`,
			)
			const tx = await this.approveForEdge(edge)
			console.log(tx?.transactionHash)
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
}
