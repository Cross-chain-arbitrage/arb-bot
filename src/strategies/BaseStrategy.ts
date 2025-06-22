import { PoolType } from '../dex/PoolUtils'
import { GraphArbitrageBot } from '../graphs/GraphArbitrageBot'
import { GraphBuildConfig, GraphBuilder } from '../graphs/GraphBuilder'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
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

export abstract class BaseStrategy {
	constructor(private readonly config: StrategyConfig) {}

	async run() {
		if (this.config.giveApprovals) {
			await this.prepare()
		}

		logger.info('Starting Graph Arbitrage Bot')

		const bot = await this.buildBot()

		logger.info('Starting searching for arbitrage')

		bot.start()
	}

	private async buildBot(): Promise<GraphArbitrageBot> {
		const priceOracle = await PriceOracle.create()
		const graph = await GraphBuilder.build(this.config.graphBuildConfig)

		return new GraphArbitrageBot({
			name: this.config.name,
			graph,
			priceOracle,
			TgArbitrageNotifier: new TgArbitrageNotifier(),
			startToken: this.config.startToken,
			options: {
				graphOptimizerOptions: this.config.graphOptimizerOptions,
				minProfitUsd: this.config.minProfitUsd,
				pollingInterval: this.config.pollingInterval,
				arbitrageTimeout: this.config.arbitrageTimeout,
			},
		})
	}

	private async prepare() {
		logger.info('Starting WethPoolsStrategy')

		const bot = await this.buildBot()

		await bot.approveAll()
	}
}
