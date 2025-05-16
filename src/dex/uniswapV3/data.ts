import { hemi } from 'viem/chains'

export const peripheryAddresses: Record<number, PoolPeriphery | undefined> = {
	[hemi.id]: {
		quoter: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
		router: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
	},
}
