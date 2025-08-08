import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GasZipBridge } from '../bridges/GasZip/GasZipBridge'
import { FuseBridgeService } from '../bridges/layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { SimpleStargateService } from '../bridges/layerzero-bridges/stargate/simple-stargate.service'
import { StargateService } from '../bridges/layerzero-bridges/stargate/stargate-service'
import { RelayService } from '../bridges/relay/relay-service'
import { ChainClientService } from '../chain-client/chain-client.service'
import { PoolType, PoolUtils } from '../dex/PoolUtils'
import { GraphArbitrageBot } from '../graphs/GraphArbitrageBot'
import { GraphBalanceReporter } from '../graphs/GraphBalanceReporter'
import {
	AdditionalEdgeConfig,
	EdgeType,
	GraphBuildConfig,
	GraphBuilder,
} from '../graphs/GraphBuilder'
import { GraphExecutor } from '../graphs/GraphExecutor'
import { GraphVisualizer } from '../graphs/GraphVisualizer'
import { Graph } from '../graphs/primitives/Graph'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
import { PriceOracleService } from '../modules/price-oracle/price-oracle.service'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { SolanaToken } from '../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../solana/solana-tokens/solana-token-utils'
import { loadConfig } from './configuration'

export interface PoolData {
	address: Address
	chainId: number
	type: PoolType
}

export interface StrategyConfig {
	botName: string
	dryRun: boolean
	giveApprovals: boolean
	startToken: GraphNode
	minProfitUsd: number
	graphBuildConfig: GraphBuildConfig
	graphOptimizerOptions: GraphOptimizerOptions
	opportunityCheckInterval: number
	arbitrageExecutionTimeout: number
}

@Injectable()
export class Strategy implements OnApplicationBootstrap {
	constructor(
		readonly baseConfigService: ConfigService<
			ReturnType<typeof loadConfig>,
			true
		>,
		readonly tokenUtils: TokenUtils,
		readonly poolUtils: PoolUtils,
		readonly graphBuilder: GraphBuilder,
		readonly priceOracle: PriceOracleService,
		readonly chainClientService: ChainClientService,
		readonly tgArbitrageNotifier: TgArbitrageNotifier,
		readonly tgBalancesNotifier: TgBalancesNotifier,
		readonly graphVisualizer: GraphVisualizer,
		readonly simpleStargateService: SimpleStargateService,
		readonly relayService: RelayService,
		readonly stargateService: StargateService,
		readonly fuseBridgeService: FuseBridgeService,
		readonly graphExecutor: GraphExecutor,
		readonly gasZipBridge: GasZipBridge,
		readonly logger: Logger,
		readonly solanaTokenUtils: SolanaTokenUtils,
	) {}

	async onApplicationBootstrap() {
		// Create a wrapper that always uses infer: true
		const config = {
			get: <K extends keyof ReturnType<typeof loadConfig>>(key: K) =>
				this.baseConfigService.get(key, { infer: true }),
		}

		const startTokenId = config.get('startTokenId')

		const startToken = await this.getNode(startTokenId)

		const graphBuilderConfig = config.get('graphBuilderConfig')

		const additionalEdges: AdditionalEdgeConfig[] = []
		for (const edge of graphBuilderConfig.additionalEdges ?? []) {
			const from = await this.getNode(edge.from)
			const to = await this.getNode(edge.to)

			additionalEdges.push({
				from,
				to,
				type: edge.type as EdgeType,
			})
		}

		const strategyConfig: StrategyConfig = {
			botName: config.get('botName'),
			dryRun: config.get('isDryRun'),
			giveApprovals: config.get('giveApprovals'),
			startToken: startToken,
			minProfitUsd: config.get('minProfitUsd'),
			opportunityCheckInterval: config.get('opportunityCheckInterval'),
			arbitrageExecutionTimeout: config.get('arbitrageExecutionTimeout'),
			graphBuildConfig: {
				pools: await this.poolUtils.createPools(
					graphBuilderConfig.pools,
				),
				connectSecondaryChains:
					graphBuilderConfig.connectSecondaryChains,
				baseChainId: graphBuilderConfig.baseChainId,
				edgeCacheTTL: graphBuilderConfig.edgeCacheTTL ?? 3000,
				additionalEdges: additionalEdges,
			},
			graphOptimizerOptions: config.get('graphOptimizerConfig'),
		}

		await this.run(strategyConfig)
	}

	async getNode(nodeConfig: { chainId: number | 'solana'; address: string }) {
		if (nodeConfig.chainId === 'solana') {
			return this.solanaTokenUtils.fromAddress<SolanaToken>(
				nodeConfig.address,
			)
		}

		return this.tokenUtils.fromAddress(
			nodeConfig.address as `0x${string}`,
			nodeConfig.chainId,
		)
	}

	async run(config: StrategyConfig) {
		this.logConfig(config)
		this.logger.log('Building Graph')
		const graph = await this.graphBuilder.build(config.graphBuildConfig)

		this.logger.log('Initializing PriceOracle')

		await this.priceOracle.initializePriceUpdating(
			Array.from(graph.nodes.values()),
		)

		const bot = this.buildBot(graph, config)

		if (config.giveApprovals) await this.prepare(bot)

		if (!config.dryRun) {
			const balanceReporter = new GraphBalanceReporter(
				bot,
				this.tgBalancesNotifier,
				this.chainClientService,
				this.priceOracle,
				this.logger,
			)
			balanceReporter.start()
		}

		this.logger.log('Starting Graph Arbitrage Bot')
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
				dryRun: config.dryRun,
			},
			this.graphVisualizer,
			this.graphExecutor,
			this.priceOracle,
			this.logger,
		)
	}

	private async prepare(bot: GraphArbitrageBot) {
		this.logger.log('Starting WethPoolsStrategy')

		await bot.approveAll()
	}

	logConfig(config: StrategyConfig) {
		const startToken = {
			address: config.startToken.address,
			chainId: config.startToken.chainId,
			symbol: config.startToken.symbol,
			decimals: config.startToken.decimals,
		}

		const formattedConfig = {
			botName: config.botName,
			dryRun: config.dryRun,
			giveApprovals: config.giveApprovals,
			startToken,
			minProfitUsd: config.minProfitUsd,
			graphOptimizerOptions: config.graphOptimizerOptions,
			// TODO: log graphBuildConfig
			graphBuildConfig: {
				pools: [],
				edgeConstructors: [],
				connectSecondaryChains: false,
				baseChainId: config.graphBuildConfig.baseChainId ?? 0,
			},
			arbitrageExecutionTimeout: config.arbitrageExecutionTimeout,
			opportunityCheckInterval: config.opportunityCheckInterval,
		}

		this.logger.log({ ...formattedConfig }, 'strategy-config')
	}
}
