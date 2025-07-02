import { arbitrum, story } from 'viem/chains'
import { PoolUtils } from '../../dex/PoolUtils'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { Strategy, StrategyConfig } from '../Strategy'
import { WETH_POOLS } from './wethPools'

/* ============ Strategy Config ============ */

async function main() {
	ClientManager.useCustomRpcUrl(arbitrum.id)
	const wethStoryAddress = '0xBAb93B7ad7fE8692A878B95a8e689423437cc500'
	const wethStory = await TokenUtils.fromAddress(wethStoryAddress, story.id)

	const config: StrategyConfig = {
		name: 'Story Weth Pools Bot',
		giveApprovals: false,
		startToken: wethStory,
		minProfitUsd: 1,
		pollingInterval: 10_000,
		arbitrageTimeout: 5 * 60 * 1000,
		graphBuildConfig: {
			pools: await PoolUtils.createPools(WETH_POOLS),
			stargateConfig: {
				connectSecondaryChains: false,
				baseChainId: arbitrum.id,
			},
			slippage: 30,
		},
		graphOptimizerOptions: {
			initialValueUSD: 100,
			stepUSD: 200,
			stepsAmount: 4,
			maxPathLength: 6,
		},
	}
	const strategy = new Strategy(config)
	await strategy.run()
}

if (require.main === module) {
	void main()
}
