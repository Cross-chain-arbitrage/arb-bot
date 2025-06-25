import { arbitrum } from 'viem/chains'
import { PoolUtils } from '../../dex/PoolUtils'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { Strategy, StrategyConfig } from '../Strategy'
import { WETH_POOLS } from './wethPools'

/* ============ Strategy Config ============ */

async function main() {
	ClientManager.useCustomRpcUrl(arbitrum.id)
	const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
	const usdc = await TokenUtils.fromAddress(usdcAddress, arbitrum.id)

	const config: StrategyConfig = {
		name: 'Story Weth Pools Bot',
		giveApprovals: false,
		startToken: usdc,
		minProfitUsd: 2.5,
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
			initialValueUSD: 200,
			stepUSD: 200,
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
