import { Address } from 'viem'
import { fuse, hemi, lightlinkPhoenix, story } from 'viem/chains'
import { PoolType } from '../../dex/PoolUtils'

export const WETH_POOLS: {
	address: Address
	type: PoolType
	chainId: number
}[] = [
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
		address: '0x3dd013fddf4daa3b642a1538e274d85e8e54ae8b', // WETH/USDC
		type: PoolType.UNIV3,
		chainId: story.id,
	},
	{
		type: PoolType.UNIV3,
		address: '0x1125452469E9B9A36FE69249309fCe8925C3eEDa', // WETH/USDC
		chainId: lightlinkPhoenix.id,
	},
]
