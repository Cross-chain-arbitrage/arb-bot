import { Injectable } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { FuseBridgeService } from '../bridges/layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { SimpleStargateService } from '../bridges/layerzero-bridges/stargate/simple-stargate.service'
import { StargateService } from '../bridges/layerzero-bridges/stargate/stargate-service'
import { RelayService } from '../bridges/relay/relay-service'
import { PoolType } from '../dex/PoolUtils'
import { GraphArbitrageBot } from '../graphs/GraphArbitrageBot'
import { GraphBalanceReporter } from '../graphs/GraphBalanceReporter'
import { GraphBuildConfig, GraphBuilder } from '../graphs/GraphBuilder'
import { GraphExecutor } from '../graphs/GraphExecutor'
import { GraphVisualizer } from '../graphs/GraphVisualizer'
import {
	ActionType,
	GasZipBridgeEdge,
	RelayBridgeEdge,
	SimpleStargateBridgeEdge,
} from '../graphs/primitives/Edge'
import { Graph } from '../graphs/primitives/Graph'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
import { PriceOracleService } from '../modules/price-oracle/price-oracle.service'
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
	dryRun?: boolean
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
	opportunityCheckInterval: number
	arbitrageExecutionTimeout: number
}

@Injectable()
export class Strategy {
	constructor(
		readonly graphBuilder: GraphBuilder,
		readonly priceOracle: PriceOracleService,
		readonly chainClientService: ChainClientService,
		readonly tokenUtils: TokenUtils,
		readonly tgArbitrageNotifier: TgArbitrageNotifier,
		readonly tgBalancesNotifier: TgBalancesNotifier,
		readonly graphVisualizer: GraphVisualizer,
		readonly simpleStargateService: SimpleStargateService,
		readonly relayService: RelayService,
		readonly stargateService: StargateService,
		readonly fuseBridgeService: FuseBridgeService,
		readonly graphExecutor: GraphExecutor,
		readonly logger: Logger,
	) {}

	async run(config: StrategyConfig) {
		logger.info('Building Graph')
		const graph = await this.graphBuilder.build(config.graphBuildConfig)

		if (config.graphBuildConfig.edgeConstructors) {
			for (const edgeConstructor of config.graphBuildConfig
				.edgeConstructors) {
				switch (edgeConstructor.type) {
					case ActionType.SIMPLE_STARGATE_BRIDGE:
						graph.addEdge(
							new SimpleStargateBridgeEdge(
								this.chainClientService,
								this.simpleStargateService,
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
								this.relayService,
								edgeConstructor.from,
								edgeConstructor.to,
								graph,
							),
						)
						break

					case ActionType.GAS_ZIP_BRIDGE:
						graph.addEdge(
							new GasZipBridgeEdge(
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

		const bot = this.buildBot(graph, config)

		if (config.giveApprovals) await this.prepare(bot)

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

	private buildBot(graph: Graph, config: StrategyConfig): GraphArbitrageBot {
		return new GraphArbitrageBot(
			config.botName,
			this.tgArbitrageNotifier,
			{
				graph,
				startToken: config.startToken,
				graphOptimizerOptions: config.graphOptimizerOptions,
			},
			{
				minProfitUsd: config.minProfitUsd,
				opportunityCheckInterval: config.opportunityCheckInterval,
				arbitrageExecutionTimeout: config.arbitrageExecutionTimeout,
			},
			this.chainClientService,
			this.graphVisualizer,
			this.tokenUtils,
			this.stargateService,
			this.fuseBridgeService,
			this.graphExecutor,
			this.priceOracle,
			this.logger,
		)
	}

	private async prepare(bot: GraphArbitrageBot) {
		logger.info('Starting WethPoolsStrategy')

		await bot.approveAll()
	}
}
