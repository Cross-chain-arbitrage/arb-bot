import { getAddress } from 'viem'
import { bsc } from 'viem/chains'

export const PANCAKE_V2_PERIPHERY: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
		}
	}
> = {
	[bsc.id]: {
		[getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73')]: {
			router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
		},
	},
}
