// import { NestFactory } from '@nestjs/core'
// import { base, swellchain } from 'viem/chains'
// import { FuseBridgeService } from '../bridges/layerzero-bridges/fuse-bridge/fuse-bridge.service'
// import { SimpleStargateService } from '../bridges/layerzero-bridges/stargate/simple-stargate.service'
// import { StargateService } from '../bridges/layerzero-bridges/stargate/stargate-service'
// import { RelayService } from '../bridges/relay/relay-service'
// import { PoolUtils } from '../dex/PoolUtils'
// import { GraphBuilder } from '../graphs/GraphBuilder'
// import { GraphExecutor } from '../graphs/GraphExecutor'
// import { GraphVisualizer } from '../graphs/GraphVisualizer'
// import { ActionType } from '../graphs/primitives/Edge'
// import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
// import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
// import { PriceOracleService } from '../modules/price-oracle/price-oracle.service'
// import { TokenUtils } from '../primitives/tokens/TokenUtils'
// import { ChainClientService } from '../utils/ChainClientService'
// import { PoolData, StrategyConfig } from './Strategy'
// import { AppModule } from './app.module'

// export const SWELLCHAIN_WETH_POOLS: PoolData[] = [
// 	{
// 		type: 'UNI_V3',
// 		address: '0x455d7f0E33daFEAde8b4c18f22383cBDd6108047', // USDC/USDE
// 		chainId: base.id,
// 	},
// 	{
// 		type: 'PANCAKE_V3',
// 		address: '0x72ab388e2e2f6facef59e3c3fa2c4e29011c2d38', // WETH/USDC
// 		chainId: base.id,
// 	},
// 	{
// 		type: 'VELODROME_V2',
// 		address: '0x6f96c6f73147db99716a0328eda2b6bff136cdb8', // WETH/USDE
// 		chainId: swellchain.id,
// 	},
// ]

// /* ============ Strategy Config ============ */

// async function main() {
// 	const context = await NestFactory.createApplicationContext(AppModule)
// 	const chainClientService = context.get(ChainClientService)
// 	const tokenUtils = context.get(TokenUtils)
// 	const poolUtils = context.get(PoolUtils)
// 	const graphExecutor = context.get(GraphExecutor)
// 	const graphBuilder = context.get(GraphBuilder)
// 	const priceOracle = context.get(PriceOracleService)
// 	const tgArbitrageNotifier = context.get(TgArbitrageNotifier)
// 	const tgBalancesNotifier = context.get(TgBalancesNotifier)
// 	const graphVisualizer = context.get(GraphVisualizer)
// 	const simpleStargate = context.get(SimpleStargateService)
// 	const relayBridge = context.get(RelayService)
// 	const stargate = context.get(StargateService)
// 	const fuseBridge = context.get(FuseBridgeService)

// 	const baseNative = tokenUtils.getNative(base.id)
// 	const swellchainNative = tokenUtils.getNative(swellchain.id)
// 	const usdeOnBase = await tokenUtils.fromAddress(
// 		'0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
// 		base.id,
// 	)

// 	const usdeOnSwell = await tokenUtils.fromAddress(
// 		'0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
// 		swellchain.id,
// 	)

// 	const edgeConstructors = [
// 		{
// 			from: baseNative,
// 			to: swellchainNative,
// 			type: ActionType.RELAY_BRIDGE,
// 		},
// 		{
// 			from: swellchainNative,
// 			to: baseNative,
// 			type: ActionType.RELAY_BRIDGE,
// 		},
// 		{
// 			from: usdeOnBase,
// 			to: usdeOnSwell,
// 			type: ActionType.SIMPLE_STARGATE_BRIDGE,
// 		},
// 		{
// 			from: usdeOnSwell,
// 			to: usdeOnBase,
// 			type: ActionType.SIMPLE_STARGATE_BRIDGE,
// 		},
// 	]

// 	const config: StrategyConfig = {
// 		name: 'Swellchain Weth Pools Bot',
// 		giveApprovals: false,
// 		startToken: usdeOnBase,
// 		minProfitUsd: 0.5,
// 		pollingInterval: 10_000,
// 		arbitrageTimeout: 5 * 60 * 1000,
// 		graphBuildConfig: {
// 			pools: await poolUtils.createPools(SWELLCHAIN_WETH_POOLS),
// 			stargateConfig: {
// 				connectSecondaryChains: false,
// 				baseChainId: base.id,
// 			},
// 			edgeConstructors,
// 			edgeCacheTTL: 3000,
// 		},
// 		graphOptimizerOptions: {
// 			initialValueUSD: 200,
// 			stepUSD: 150,
// 			stepsAmount: 5,
// 			maxPathLength: 7,
// 		},
// 	}
// }

// if (require.main === module) {
// 	void main()
// }
