import { bsc } from 'viem/chains'
import { PoolUtils } from '../../dex/PoolUtils'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { Strategy, StrategyConfig } from '../Strategy'
import { FUSE_POOLS } from './fusePools'

const USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955'

async function main() {
	ClientManager.useCustomRpcUrl(bsc.id)

	const usdt = await TokenUtils.fromAddress(USDT_ADDRESS, bsc.id)

	const config: StrategyConfig = {
		name: 'Fuse Pools Bot',
		giveApprovals: false,
		startToken: usdt,
		minProfitUsd: 0.8,
		pollingInterval: 10_000,
		arbitrageTimeout: 5 * 60 * 1000,
		graphBuildConfig: {
			pools: await PoolUtils.createPools(FUSE_POOLS),
			stargateConfig: {
				connectSecondaryChains: false,
				baseChainId: bsc.id,
			},
		},
		graphOptimizerOptions: {
			initialValueUSD: 50,
			stepUSD: 50,
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
