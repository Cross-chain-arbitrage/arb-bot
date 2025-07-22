import { arbitrum, lightlinkPhoenix } from 'viem/chains'
import { PoolUtils } from '../dex/PoolUtils'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { PoolData, Strategy, StrategyConfig } from './Strategy'

export const LIGHTLINK_WETH_POOLS: PoolData[] = [
	{
		type: 'UNI_V3',
		address: '0x1125452469E9B9A36FE69249309fCe8925C3eEDa', // WETH/USDC
		chainId: lightlinkPhoenix.id,
	},
	{
		type: 'UNI_V3',
		address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', // WETH/USDC
		chainId: arbitrum.id,
	},
]

/* ============ Strategy Config ============ */

async function main() {
	const config: StrategyConfig = {
		name: 'LightlinkWeth Pools Bot',
		giveApprovals: false,
		startToken: TokenUtils.getNative(arbitrum.id),
		minProfitUsd: 0.4,
		pollingInterval: 10_000,
		arbitrageTimeout: 5 * 60 * 1000,
		graphBuildConfig: {
			pools: await PoolUtils.createPools(LIGHTLINK_WETH_POOLS),
			stargateConfig: {
				connectSecondaryChains: false,
				baseChainId: arbitrum.id,
			},
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
