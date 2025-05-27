import { arbitrum, hemi, lightlinkPhoenix, rootstock, story } from 'viem/chains'

export const peripheryAddresses: Record<number, PoolPeriphery | undefined> = {
	[hemi.id]: {
		quoter: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
		router: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
	},
	[arbitrum.id]: {
		quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
		router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
	},
	[story.id]: {
		quoter: '0x1434Ae03CfA29d314da73fC18013CCd04f100af6',
		router: '0x1062916B1Be3c034C1dC6C26f682Daf1861A3909',
	},
	[rootstock.id]: {
		quoter: '0xb51727c996c68e60f598a923a5006853cd2feb31',
		router: '0x0b14ff67f0014046b4b99057aec4509640b3947a',
	},
	[lightlinkPhoenix.id]: {
		quoter: '0x5911cB3633e764939edc2d92b7e1ad375Bb57649',
		router: '0xaa52bB8110fE38D0d2d2AF0B85C3A3eE622CA455',
	},
}
