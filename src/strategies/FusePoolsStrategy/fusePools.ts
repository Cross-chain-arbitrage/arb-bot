import { Address } from 'viem'
import { bsc, fuse } from 'viem/chains'
import { PoolType } from '../../dex/PoolUtils'

export const FUSE_POOLS: {
	address: Address
	type: PoolType
	chainId: number
}[] = [
	{
		address: '0x5E174874C5bc45Ba96bD859A6edA4D34EE9f4424', // FUSE/USDT
		type: 'ALGEBRA_V1_2',
		chainId: fuse.id,
	},
	{
		address: '0x6483F166b9E4310A165a55FEa04F867499aded06', // FUSE/WBNB
		type: 'PANCAKE_V2',
		chainId: bsc.id,
	},
	{
		address: '0x172fcd41e0913e95784454622d1c3724f546f849', // WBNB/USDT
		type: 'PANCAKE_V3',
		chainId: bsc.id,
	},
]
