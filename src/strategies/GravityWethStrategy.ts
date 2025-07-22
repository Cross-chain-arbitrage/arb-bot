import { arbitrum, gravity } from 'viem/chains'
import { PoolUtils } from '../dex/PoolUtils'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ClientManager } from '../utils/ChainClientService'
import { PoolData, Strategy, StrategyConfig } from './Strategy'

export const GRAVITY_WETH_POOLS: PoolData[] = [
	{
		type: 'ALGEBRA_V1_9',
		address: '0xd1607a5a4b8e26ba0dd66a3b79f9f8ed048c1a0b', // WETH/USDC
		chainId: gravity.id,
	},
	{
		type: 'UNI_V3',
		address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', // WETH/USDC
		chainId: arbitrum.id,
	},
]

/* ============ Strategy Config ============ */

async function main() {
	ClientManager.useCustomRpcUrl(arbitrum.id)

	const usdcArbAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
	const usdcArb = await TokenUtils.fromAddress(usdcArbAddress, arbitrum.id)

	const config: StrategyConfig = {
		name: 'Gravity Weth Pools Bot',
		giveApprovals: false,
		startToken: usdcArb,
		minProfitUsd: 10,
		pollingInterval: 10_000,
		arbitrageTimeout: 5 * 60 * 1000,
		graphBuildConfig: {
			pools: await PoolUtils.createPools(GRAVITY_WETH_POOLS),
			stargateConfig: {
				connectSecondaryChains: false,
				baseChainId: arbitrum.id,
			},
		},
		graphOptimizerOptions: {
			initialValueUSD: 100,
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
