import { getAddress } from 'viem'
import { gravity, superposition } from 'viem/chains'

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
	[superposition.id]: {
		[getAddress('0xCf4062Ee235BbeB4C7c0336ada689ed1c17547b6')]: {
			quoter: '0x30A4bD5b1a9e9C0D80e9a45ef486bc1f1bc8e230',
			router: '0xC216fCdEb961EEF95657Cb45dEe20e379C7624B8',
		},
	},
}
