import { getAddress } from 'viem'
import { swellchain } from 'viem/chains'

export const VELODROME_V2_PERIPHERY: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
		}
	}
> = {
	[swellchain.id]: {
		// Velodrome Universal Router
		[getAddress('0x31832f2a97Fd20664D76Cc421207669b55CE4BC0')]: {
			router: '0x01D40099fCD87C018969B0e8D4aB1633Fb34763C',
		},
	},
}
