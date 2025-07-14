import { getAddress } from 'viem'
import { swellchain } from 'viem/chains'

export const VELODROME_V1_PERIPHERY: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
			quoter: Address
		}
	}
> = {
	[swellchain.id]: {
		[getAddress('0x04625B046C69577EfC40e6c0Bb83CDBAfab5a55F')]: {
			router: '0x01D40099fCD87C018969B0e8D4aB1633Fb34763C',
			quoter: '0x846B5Cec4B4C3f7B95b3321D01e38a72D358F5C0', //mixed quoter v2
		},
	},
}
