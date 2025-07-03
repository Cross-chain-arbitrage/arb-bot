import { arbitrum, fuse } from 'viem/chains'
import { PoolType } from '../../dex/poolVariety'
import { PoolData } from '../Strategy'

export const WETH_POOLS: PoolData[] = [
	// {
	// 	address: '0x9580D4519C9F27642e21085E763E761a74eF3735', // WETH/USDC
	// 	type: PoolType.UNIV3,
	// 	chainId: hemi.id,
	// },

	{
		address: '0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6', // WETH/USDT
		type: PoolType.ALGEBRA,
		chainId: fuse.id,
	},
	// {
	// 	address: '0x2288627C696010049f6D98a84fC10F9C5F7b3Ce2', // USDC/USDT
	// 	type: PoolType.UNIV3,
	// 	chainId: lightlinkPhoenix.id,
	// },
	// {
	// 	type: PoolType.UNIV3,
	// 	address: '0x1125452469E9B9A36FE69249309fCe8925C3eEDa', // WETH/USDC
	// 	chainId: lightlinkPhoenix.id,
	// },

	{
		type: PoolType.UNIV3,
		address: '0x641C00A822e8b671738d32a431a4Fb6074E5c79d', // WETH/USDT
		chainId: arbitrum.id,
	},
	// {
	// 	type: PoolType.UNIV3,
	// 	address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', // WETH/USDC
	// 	chainId: arbitrum.id,
	// },
	// {
	// 	type: PoolType.UNIV2,
	// 	address: '0x22E77FfE8d3ee3a161f657F235807caF891F5638', // WETH/USDC
	// 	chainId: abstract.id,
	// },
]
