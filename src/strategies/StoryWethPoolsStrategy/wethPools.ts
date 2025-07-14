import { arbitrum, story } from 'viem/chains'
import { PoolData } from '../Strategy'

export const WETH_POOLS: PoolData[] = [
	{
		address: '0x0012dc8daed76fd687b51ad6a4683aa151d3d59d', // WETH/USDC
		type: 'UNI_V3',
		chainId: story.id,
	},

	{
		type: 'UNI_V3',
		address: '0x641C00A822e8b671738d32a431a4Fb6074E5c79d', // WETH/USDT
		chainId: arbitrum.id,
	},
	{
		type: 'UNI_V3',
		address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', // WETH/USDC
		chainId: arbitrum.id,
	},
]
