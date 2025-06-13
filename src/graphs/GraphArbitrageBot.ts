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

export class GraphArbitrageBot {
	private _startTokenPrice: number
	private isArbitrageExecuting = false

	constructor(
		readonly startToken: GraphNode,
		readonly graph: Graph,
		readonly graphOptimizerOptions: GraphOptimizerOptions,
		startTokenPrice: number,
		readonly minProfitUsd = 3,
		readonly pollingInterval = 10000,
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
		void runFuncWithDelay(
			this.findAndExecuteArbitrage.bind(this),
			this.pollingInterval,
		)
	}

	async findAndExecuteArbitrage() {
		if (this.isArbitrageExecuting) return

		const findOpportunityRes = await GraphOptimizer.findOpportunity(
			this.startToken,
			this.startTokenPrice,
			this.graph,
			this.graphOptimizerOptions,
		)

		if (findOpportunityRes.path) {
			const { path } = findOpportunityRes
			const expectedProfitUsd =
				Number(this.startToken.formatUnits(path.profitAmount)) *
				this.startTokenPrice

			if (expectedProfitUsd < this.minProfitUsd) {
				logger.info(
					`Profit is too low, expectedProfitUsd: $${expectedProfitUsd.toFixed(2)}, minProfitUsd: $${this.minProfitUsd}`,
				)
				return
			}

			await this.execute(path, expectedProfitUsd)
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
			console.log(
				`approving for edge ${edge.type} ${edge.from.chainId}:${edge.from.symbol} - ${edge.to.chainId}:${edge.to.symbol}`,
			)
			const tx = await this.approveForEdge(edge)
			console.log(tx?.transactionHash)
		}
	}

	private async approveForEdge(
		edge: GraphEdge,
	): Promise<TransactionReceipt | undefined> {
		const { from } = edge

		switch (edge.type) {
			case ActionType.SWAP:
				return await (edge.from as Token).approve(
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
