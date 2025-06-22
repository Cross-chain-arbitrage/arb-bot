import { arbitrum, fuse, hemi, lightlinkPhoenix } from 'viem/chains'
import { PoolType } from '../../dex/PoolUtils'
import { PoolData } from '../Strategy'

export const WETH_POOLS: PoolData[] = [
	{
		address: '0x9580D4519C9F27642e21085E763E761a74eF3735', // WETH/USDC
		type: PoolType.UNIV3,
		chainId: hemi.id,
	},
	{
		address: '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992', // WETH/WBTC
		type: PoolType.ALGEBRA,
		chainId: fuse.id,
	},
	{
		address: '0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6', // WETH/USDT
		type: PoolType.ALGEBRA,
		chainId: fuse.id,
	},
	// {
	// 	address: '0x3dd013fddf4daa3b642a1538e274d85e8e54ae8b', // WETH/USDC
	// 	type: PoolType.UNIV3,
	// 	chainId: story.id,
	// },
	// {
	// 	address: '0x0012dc8daed76fd687b51ad6a4683aa151d3d59d', // WETH/USDC
	// 	type: PoolType.UNIV3,
	// 	chainId: story.id,
	// },
	{
		address: '0x2288627C696010049f6D98a84fC10F9C5F7b3Ce2',
		type: PoolType.UNIV3,
		chainId: lightlinkPhoenix.id,
	},
	{
		type: PoolType.UNIV3,
		address: '0x1125452469E9B9A36FE69249309fCe8925C3eEDa', // WETH/USDC
		chainId: lightlinkPhoenix.id,
	},

	{
		type: PoolType.UNIV3,
		address: '0x641C00A822e8b671738d32a431a4Fb6074E5c79d', // WETH/USDT
		chainId: arbitrum.id,
	},
	{
		type: PoolType.UNIV3,
		address: '0x2f5e87C9312fa29aed5c179E456625D79015299c', // WETH/WBTC
		chainId: arbitrum.id,
	},
	{
		type: PoolType.UNIV3,
		address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', // WETH/USDC
		chainId: arbitrum.id,
	},
]
