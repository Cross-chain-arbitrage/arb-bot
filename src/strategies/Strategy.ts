import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Relay } from '../bridges/relay/Relay'
import { SimpleStargate } from '../bridges/stargate/SimpleStargate'
import { Stargate } from '../bridges/stargate/Stargate'
import { GeckoTerminalAPI } from '../dataApi/geckoterminal/GeckoTerminalAPI'
import { PoolType } from '../dex/PoolUtils'
import { GraphArbitrageBot } from '../graphs/GraphArbitrageBot'
import { GraphBalanceReporter } from '../graphs/GraphBalanceReporter'
import { GraphBuildConfig, GraphBuilder } from '../graphs/GraphBuilder'
import { GraphExecutor } from '../graphs/GraphExecutor'
import { GraphVisualizer } from '../graphs/GraphVisualizer'
import {
	ActionType,
	RelayBridgeEdge,
	SimpleStargateBridgeEdge,
} from '../graphs/primitives/Edge'
import { Graph } from '../graphs/primitives/Graph'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
import { PriceOracle } from '../modules/PriceOracle/PriceOracle'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'
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
	graphBuildConfig: GraphBuildConfig & {
		edgeConstructors?: {
			from: Token | NativeCurrency
			to: Token | NativeCurrency
			type: ActionType
		}[]
	}
	graphOptimizerOptions: GraphOptimizerOptions
	pollingInterval: number
	arbitrageTimeout: number
}

export class Strategy {
	constructor(
		private readonly config: StrategyConfig,
		readonly graphBuilder: GraphBuilder,
		readonly priceOracle: PriceOracle,
		readonly chainClientService: ChainClientService,
		readonly tokenUtils: TokenUtils,
		readonly geckoTerminalAPI: GeckoTerminalAPI,
		readonly tgArbitrageNotifier: TgArbitrageNotifier,
		readonly tgBalancesNotifier: TgBalancesNotifier,
		readonly graphVisualizer: GraphVisualizer,
		readonly simpleStargate: SimpleStargate,
		readonly relayBridge: Relay,
		readonly stargate: Stargate,
		readonly fuseBridge: FuseBridge,
		readonly graphExecutor: GraphExecutor,
	) {}

	async run() {
		logger.info('Building Graph')
		const graph = await this.graphBuilder.build(
			this.config.graphBuildConfig,
		)

		if (this.config.graphBuildConfig.edgeConstructors) {
			for (const edgeConstructor of this.config.graphBuildConfig
				.edgeConstructors) {
				switch (edgeConstructor.type) {
					case ActionType.SIMPLE_STARGATE_BRIDGE:
						graph.addEdge(
							new SimpleStargateBridgeEdge(
								this.chainClientService,
								this.simpleStargate,
								edgeConstructor.from,
								edgeConstructor.to,
								graph,
							),
						)
						break

					case ActionType.RELAY_BRIDGE:
						graph.addEdge(
							new RelayBridgeEdge(
								this.chainClientService,
								this.relayBridge,
								edgeConstructor.from,
								edgeConstructor.to,
								graph,
							),
						)
						break
					default:
						throw new Error(
							`${edgeConstructor.type} can be added by more convenient way`,
						)
				}
			}
		}

		logger.info('Initializing PriceOracle')
		await this.priceOracle.initializePriceUpdating(
			Array.from(graph.nodes.values()),
		)

		const bot = this.buildBot(graph)

		if (this.config.giveApprovals) await this.prepare(bot)

		const balanceReporter = new GraphBalanceReporter(
			bot,
			new TgBalancesNotifier(),
			this.chainClientService,
			this.priceOracle,
		)
		balanceReporter.start()

		logger.info('Starting Graph Arbitrage Bot')
		bot.start()
	}

	private buildBot(graph: Graph): GraphArbitrageBot {
		return new GraphArbitrageBot(
			this.config.name,
			this.tgArbitrageNotifier,
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
			this.chainClientService,
			this.graphVisualizer,
			this.tokenUtils,
			this.stargate,
			this.fuseBridge,
			this.graphExecutor,
			this.priceOracle,
		)
	}

	private async prepare(bot: GraphArbitrageBot) {
		logger.info('Starting WethPoolsStrategy')

		await bot.approveAll()
	}
}
