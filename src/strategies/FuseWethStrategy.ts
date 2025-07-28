import { arbitrum, fuse } from 'viem/chains'
import { PoolUtils } from '../dex/PoolUtils'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { PoolData, Strategy, StrategyConfig } from './Strategy'

export const FUSE_WETH_POOLS: PoolData[] = [
	{
		address: '0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6', // WETH/USDT
		type: 'ALGEBRA_V1_2',
		chainId: fuse.id,
	},
	{
		type: 'UNI_V3',
		address: '0x641C00A822e8b671738d32a431a4Fb6074E5c79d', // WETH/USDT
		chainId: arbitrum.id,
	},
]

/* ============ Strategy Config ============ */

async function main() {
	const config: StrategyConfig = {
		name: 'Fuse Weth Pools Bot',
		giveApprovals: false,
		startToken: TokenUtils.getNative(arbitrum.id),
		minProfitUsd: 0.45,
		pollingInterval: 10_000,
		arbitrageTimeout: 5 * 60 * 1000,
		graphBuildConfig: {
			pools: await PoolUtils.createPools(FUSE_WETH_POOLS),
			stargateConfig: {
				connectSecondaryChains: false,
				baseChainId: arbitrum.id,
			},
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
