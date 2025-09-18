import { getAddress } from 'viem'
import { mainnet } from 'viem/chains'

export const UNIV2_PERIPHERY_CONFIG: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
		}
	}
> = {
	[mainnet.id]: {
		[getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f')]: {
			router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
		},
	},
}
