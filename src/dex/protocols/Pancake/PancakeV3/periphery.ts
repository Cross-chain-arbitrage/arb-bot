import { getAddress } from 'viem'
import { base, bsc } from 'viem/chains'

export const PANCAKE_V3_PERIPHERY: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
			quoter: Address
			is02Router: boolean
		}
	}
> = {
	[bsc.id]: {
		[getAddress('0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865')]: {
			quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
			router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
			is02Router: false,
		},
	},
	[base.id]: {
		[getAddress('0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865')]: {
			quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
			router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
			is02Router: false,
		},
	},
}
