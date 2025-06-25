import { arbitrum } from 'viem/chains'
import { PoolUtils } from '../../dex/PoolUtils'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { Strategy, StrategyConfig } from '../Strategy'
import { WBTC_POOLS } from './wbtcPools'

/* ============ Strategy Config ============ */

async function main() {
	ClientManager.useCustomRpcUrl(arbitrum.id)

	const config: StrategyConfig = {
		name: 'WBTC Fuse Bot',
		giveApprovals: false,
		startToken: TokenUtils.getNative(arbitrum.id),
		minProfitUsd: 1,
		pollingInterval: 10_000,
		arbitrageTimeout: 5 * 60 * 1000,
		graphBuildConfig: {
			pools: await PoolUtils.createPools(WBTC_POOLS),
			stargateConfig: {
				connectSecondaryChains: false,
				baseChainId: arbitrum.id,
			},
			slippage: 30,
		},
		graphOptimizerOptions: {
			initialValueUSD: 200,
			stepUSD: 100,
			stepsAmount: 5,
			maxPathLength: 6,
		},
	}
	const strategy = new Strategy(config)
	await strategy.run()
}

if (require.main === module) {
	void main()
}
