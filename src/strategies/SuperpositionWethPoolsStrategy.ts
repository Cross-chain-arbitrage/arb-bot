// import { arbitrum, superposition } from 'viem/chains'
// import { PoolUtils } from '../dex/PoolUtils'
// import { ActionType } from '../graphs/primitives/Edge'
// import { TokenUtils } from '../primitives/tokens/TokenUtils'
// import { PoolData, Strategy, StrategyConfig } from './Strategy'

// export const SUPERPOSITION_WETH_POOLS: PoolData[] = [
// 	{
// 		type: 'ALGEBRA_V1_9',
// 		address: '0x7FC956a5C0Aef46AA25b8911f4cb4619CbB7d90F', // WETH/USDC
// 		chainId: superposition.id,
// 	},
// 	{
// 		type: 'UNI_V3',
// 		address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', // WETH/USDC
// 		chainId: arbitrum.id,
// 	},
// ]

// /* ============ Strategy Config ============ */

// async function main() {
// 	const arbNative = TokenUtils.getNative(arbitrum.id)
// 	const superpositionNative = TokenUtils.getNative(superposition.id)

// 	const edgeConstructors = [
// 		{
// 			from: arbNative,
// 			to: superpositionNative,
// 			type: ActionType.GAS_ZIP_BRIDGE,
// 		},
// 		{
// 			from: superpositionNative,
// 			to: arbNative,
// 			type: ActionType.GAS_ZIP_BRIDGE,
// 		},
// 	]

// 	const config: StrategyConfig = {
// 		name: 'Superposition Weth Pools Bot',
// 		dryRun: true,
// 		giveApprovals: false,
// 		startToken: TokenUtils.getNative(arbitrum.id),
// 		minProfitUsd: 0.4,
// 		pollingInterval: 10_000,
// 		arbitrageTimeout: 5 * 60 * 1000,
// 		graphBuildConfig: {
// 			pools: await PoolUtils.createPools(SUPERPOSITION_WETH_POOLS),
// 			stargateConfig: {
// 				connectSecondaryChains: false,
// 				baseChainId: arbitrum.id,
// 			},
// 			edgeConstructors,
// 			edgeCacheTTL: 3000,
// 		},
// 		graphOptimizerOptions: {
// 			initialValueUSD: 200,
// 			stepUSD: 200,
// 			stepsAmount: 5,
// 			maxPathLength: 6,
// 		},
// 	}
// 	const strategy = new Strategy(config)
// 	await strategy.run()
// }

// if (require.main === module) {
// 	void main()
// }
