import { getAddress } from 'viem'
import { fuse } from 'viem/chains'

export const ALGEBRA_V1_2_PERIPHERY: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
			quoter: Address
		}
	}
> = {
	[fuse.id]: {
		[getAddress('0xccEdb990abBf0606Cf47e7C6A26e419931c7dc1F')]: {
			quoter: '0xF95978f3525eC2Bd1411f46A4cA64DEd30Adc677',
			router: '0x6E055FfA786Dfe9DBB214b649a9b2A169e6B820b',
		},
	},
}
