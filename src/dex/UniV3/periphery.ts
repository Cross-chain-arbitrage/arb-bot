import { getAddress } from 'viem'
import { arbitrum, hemi, lightlinkPhoenix, rootstock, story } from 'viem/chains'

export const UNIV3_PERIPHERY_CONFIG: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
			quoter: Address
			is02Router: boolean
		}
	}
> = {
	[hemi.id]: {
		[getAddress('0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959')]: {
			quoter: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
			router: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
			is02Router: false,
		},
	},
	[arbitrum.id]: {
		[getAddress('0x1F98431c8aD98523631AE4a59f267346ea31F984')]: {
			quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
			router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
			is02Router: false,
		},
	},
	[story.id]: {
		// StoryHunt
		[getAddress('0xa111dDbE973094F949D78Ad755cd560F8737B7e2')]: {
			quoter: '0x1434Ae03CfA29d314da73fC18013CCd04f100af6',
			router: '0x1062916B1Be3c034C1dC6C26f682Daf1861A3909',
			is02Router: false,
		},
		// PiperX
		[getAddress('0xb8c21e89983B5EcCD841846eA294c4c8a89718f1')]: {
			quoter: '0xe8CabF9d1FFB6CE23cF0a86641849543ec7BD7d5',
			router: '0x8295c195CEe31404ea082d253a140310b9a0A37e',
			is02Router: false,
		},
	},
	[rootstock.id]: {
		[getAddress('0xaF37EC98A00FD63689CF3060BF3B6784E00caD82')]: {
			quoter: '0xb51727c996c68e60f598a923a5006853cd2feb31',
			router: '0x0b14ff67f0014046b4b99057aec4509640b3947a',
			is02Router: false,
		},
	},
	[lightlinkPhoenix.id]: {
		[getAddress('0xcb2436774C3e191c85056d248EF4260ce5f27A9D')]: {
			quoter: '0x5911cB3633e764939edc2d92b7e1ad375Bb57649',
			router: '0xaa52bB8110fE38D0d2d2AF0B85C3A3eE622CA455',
			is02Router: true,
		},
	},
}
