import { getAddress } from 'viem'
import { gravity } from 'viem/chains'

export const ALGEBRA_V1_9_PERIPHERY: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
			quoter: Address
		}
	}
> = {
	[gravity.id]: {
		[getAddress('0x10aA510d94E094Bd643677bd2964c3EE085Daffc')]: {
			router: '0x60A186019F81bFD04aFc16c9C01804a04E79e68B',
			quoter: '0x52CFD1d72A64f8D13711bb7Dc3899653dbd4191B',
		},
	},
}
