import { fuse } from 'viem/chains'

export const peripheryAddresses: Record<number, PoolPeriphery | undefined> = {
	[fuse.id]: {
		quoter: '0xF95978f3525eC2Bd1411f46A4cA64DEd30Adc677',
		router: '0x6E055FfA786Dfe9DBB214b649a9b2A169e6B820b',
	},
}
