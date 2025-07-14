import { PoolType } from '../dex/PoolUtils'
import { GraphArbitrageBot } from '../graphs/GraphArbitrageBot'
import { GraphBalanceReporter } from '../graphs/GraphBalanceReporter'
import { GraphBuildConfig, GraphBuilder } from '../graphs/GraphBuilder'
import { Graph } from '../graphs/primitives/Graph'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
import { PriceOracle } from '../modules/PriceOracle/PriceOracle'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import logger from '../utils/logger'

export interface PoolData {
	address: Address
	chainId: number
	type: PoolType
}

export interface StrategyConfig {
	name: string
	giveApprovals: boolean
	startToken: Token | NativeCurrency
	minProfitUsd: number
	graphBuildConfig: GraphBuildConfig
	graphOptimizerOptions: GraphOptimizerOptions
	pollingInterval: number
	arbitrageTimeout: number
}

export class Strategy {
	constructor(private readonly config: StrategyConfig) {}

	async run() {
		logger.info('Building Graph')
		const graph = await GraphBuilder.build(this.config.graphBuildConfig)

		logger.info('Initializing PriceOracle')
		await PriceOracle.initializePriceUpdating(
			Array.from(graph.nodes.values()),
		)

		const bot = this.buildBot(graph)

		if (this.config.giveApprovals) await this.prepare(bot)

		const balanceReporter = new GraphBalanceReporter(
			bot,
			new TgBalancesNotifier(),
		)
		balanceReporter.start()

		logger.info('Starting Graph Arbitrage Bot')
		bot.start()
	}

	private buildBot(graph: Graph): GraphArbitrageBot {
		return new GraphArbitrageBot(
			this.config.name,
			new TgArbitrageNotifier(),
			{
				graph,
				startToken: this.config.startToken,
				graphOptimizerOptions: this.config.graphOptimizerOptions,
			},
			{
				minProfitUsd: this.config.minProfitUsd,
				pollingInterval: this.config.pollingInterval,
				arbitrageTimeout: this.config.arbitrageTimeout,
			},
		)
	}

	private async prepare(bot: GraphArbitrageBot) {
		logger.info('Starting WethPoolsStrategy')

		await bot.approveAll()
	}
}
