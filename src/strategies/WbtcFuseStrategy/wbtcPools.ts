import { arbitrum, fuse } from 'viem/chains'
import { PoolType } from '../../dex/PoolUtils'
import { PoolData } from '../Strategy'

export const WBTC_POOLS: PoolData[] = [
	{
		address: '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992', // WETH/WBTC
		type: PoolType.ALGEBRA,
		chainId: fuse.id,
	},

	{
		type: PoolType.UNIV3,
		address: '0x2f5e87C9312fa29aed5c179E456625D79015299c', // WETH/WBTC
		chainId: arbitrum.id,
	},
]
