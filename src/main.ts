import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { PoolUtils } from './dex/PoolUtils'
import { ActionType } from './graphs/primitives/Edge'
import { Token } from './primitives/tokens/Token'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { AppModule } from './strategies/app.module'
import { loadConfig } from './strategies/configuration'
import { Strategy, StrategyConfig } from './strategies/Strategy'

/* ============ Strategy Config ============ */

async function main() {
	const context = await NestFactory.createApplicationContext(AppModule)
	const baseConfigService = context.get(
		ConfigService<ReturnType<typeof loadConfig>, true>,
	)

	// Create a wrapper that always uses infer: true
	const config = {
		get: <K extends keyof ReturnType<typeof loadConfig>>(key: K) =>
			baseConfigService.get(key, { infer: true }),
	}

	const tokenUtils = context.get(TokenUtils)
	const poolUtils = context.get(PoolUtils)

	const startTokenId = config.get('startTokenId')

	const startToken = await tokenUtils.fromAddress(
		startTokenId.address,
		startTokenId.chainId,
	)

	const graphBuilderConfig = config.get('graphBuilderConfig')

	const edgeConstructors: {
		from: Token
		to: Token
		type: ActionType
	}[] = []

	if (graphBuilderConfig.additionalEdges) {
		for (const additionalEdge of graphBuilderConfig.additionalEdges) {
			edgeConstructors.push({
				from: await tokenUtils.fromAddress(
					additionalEdge.from.address,
					additionalEdge.from.chainId,
				),
				to: await tokenUtils.fromAddress(
					additionalEdge.to.address,
					additionalEdge.to.chainId,
				),
				type: additionalEdge.type as ActionType,
			})
		}
	}

	const strategyConfig: StrategyConfig = {
		botName: config.get('botName'),
		giveApprovals: config.get('giveApprovals'),
		startToken: startToken,
		minProfitUsd: config.get('minProfitUsd'),
		opportunityCheckInterval: config.get('opportunityCheckInterval'),
		arbitrageExecutionTimeout: config.get('arbitrageExecutionTimeout'),
		graphBuildConfig: {
			pools: await poolUtils.createPools(graphBuilderConfig.pools),
			connectSecondaryChains: graphBuilderConfig.connectSecondaryChains,
			baseChainId: graphBuilderConfig.baseChainId,
			edgeConstructors,
			edgeCacheTTL: graphBuilderConfig.edgeCacheTTL ?? 3000,
		},
		graphOptimizerOptions: config.get('graphOptimizerConfig'),
	}

	const strategy = context.get(Strategy)
	await strategy.run(strategyConfig)
}

if (require.main === module) {
	void main()
}
