import { arbitrum, fuse } from 'viem/chains'
import { PoolUtils } from '../dex/PoolUtils'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ClientManager } from '../utils/ChainClientService'
import { PoolData, Strategy, StrategyConfig } from './Strategy'

export const WBTC_POOLS: PoolData[] = [
	{
		address: '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992', // WETH/WBTC
		type: 'ALGEBRA_V1_2',
		chainId: fuse.id,
	},

	{
		type: 'UNI_V3',
		address: '0x2f5e87C9312fa29aed5c179E456625D79015299c', // WETH/WBTC
		chainId: arbitrum.id,
	},
]

/* ============ Strategy Config ============ */

async function main() {
	ClientManager.useCustomRpcUrl(arbitrum.id)

	const config: StrategyConfig = {
		name: 'WBTC Fuse Bot',
		giveApprovals: false,
		startToken: TokenUtils.getNative(arbitrum.id),
		minProfitUsd: 0.5,
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
