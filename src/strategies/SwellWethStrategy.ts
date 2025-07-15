import { base, swellchain } from 'viem/chains'
import { PoolUtils } from '../dex/PoolUtils'
import { ActionType } from '../graphs/primitives/Edge'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ClientManager } from '../utils/ClientManager'
import { PoolData, Strategy, StrategyConfig } from './Strategy'

export const SWELLCHAIN_WETH_POOLS: PoolData[] = [
	{
		type: 'UNI_V3',
		address: '0x455d7f0E33daFEAde8b4c18f22383cBDd6108047', // USDC/USDE
		chainId: base.id,
	},
	{
		type: 'PANCAKE_V3',
		address: '0x72ab388e2e2f6facef59e3c3fa2c4e29011c2d38', // WETH/USDC
		chainId: base.id,
	},
	{
		type: 'VELODROME_V2',
		address: '0x6f96c6f73147db99716a0328eda2b6bff136cdb8', // WETH/USDE
		chainId: swellchain.id,
	},
]

/* ============ Strategy Config ============ */

async function main() {
	ClientManager.useCustomRpcUrl(base.id)

	const baseNative = TokenUtils.getNative(base.id)
	const swellchainNative = TokenUtils.getNative(swellchain.id)
	const usdeOnBase = await TokenUtils.fromAddress(
		'0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
		base.id,
	)

	const usdeOnSwell = await TokenUtils.fromAddress(
		'0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
		swellchain.id,
	)

	const edgeConstructors = [
		{
			from: baseNative,
			to: swellchainNative,
			type: ActionType.RELAY_BRIDGE,
		},
		{
			from: swellchainNative,
			to: baseNative,
			type: ActionType.RELAY_BRIDGE,
		},
		{
			from: usdeOnBase,
			to: usdeOnSwell,
			type: ActionType.SIMPLE_STARGATE_BRIDGE,
		},
		{
			from: usdeOnSwell,
			to: usdeOnBase,
			type: ActionType.SIMPLE_STARGATE_BRIDGE,
		},
	]

	const config: StrategyConfig = {
		name: 'Swellchain Weth Pools Bot',
		giveApprovals: false,
		startToken: usdeOnBase,
		minProfitUsd: 5,
		pollingInterval: 10_000,
		arbitrageTimeout: 5 * 60 * 1000,
		graphBuildConfig: {
			pools: await PoolUtils.createPools(SWELLCHAIN_WETH_POOLS),
			stargateConfig: {
				connectSecondaryChains: false,
				baseChainId: base.id,
			},
			edgeConstructors,
		},
		graphOptimizerOptions: {
			initialValueUSD: 200,
			stepUSD: 150,
			stepsAmount: 5,
			maxPathLength: 7,
		},
	}

	const strategy = new Strategy(config)
	await strategy.run()
}

if (require.main === module) {
	void main()
}
