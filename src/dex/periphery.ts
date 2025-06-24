import {
	arbitrum,
	bsc,
	fuse,
	hemi,
	lightlinkPhoenix,
	mainnet,
	rootstock,
	story,
} from 'viem/chains'
import { PoolType } from './poolVariety'

export interface PoolPeriphery {
	[PoolType.UNIV3]?: UniV3PoolPeriphery
	[PoolType.UNIV2]?: UniV2PoolPeriphery
	[PoolType.PANCAKEV3]?: UniV3PoolPeriphery
	[PoolType.PANCAKEV2]?: UniV2PoolPeriphery
	[PoolType.ALGEBRA]?: UniV3PoolPeriphery
}

export const CHAIN_PERIPHERY_CONFIG: Record<number, PoolPeriphery> = {
	[mainnet.id]: {
		[PoolType.UNIV2]: {
			router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
		},
	},
	[hemi.id]: {
		[PoolType.UNIV3]: {
			quoter: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
			router: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
		},
	},
	[arbitrum.id]: {
		[PoolType.UNIV3]: {
			quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
			router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
		},
	},
	[story.id]: {
		[PoolType.UNIV3]: {
			quoter: '0x1434Ae03CfA29d314da73fC18013CCd04f100af6',
			router: '0x1062916B1Be3c034C1dC6C26f682Daf1861A3909',
		},
	},
	[rootstock.id]: {
		[PoolType.UNIV3]: {
			quoter: '0xb51727c996c68e60f598a923a5006853cd2feb31',
			router: '0x0b14ff67f0014046b4b99057aec4509640b3947a',
		},
	},
	[lightlinkPhoenix.id]: {
		[PoolType.UNIV3]: {
			quoter: '0x5911cB3633e764939edc2d92b7e1ad375Bb57649',
			router: '0xaa52bB8110fE38D0d2d2AF0B85C3A3eE622CA455',
		},
	},
	[fuse.id]: {
		[PoolType.ALGEBRA]: {
			quoter: '0xF95978f3525eC2Bd1411f46A4cA64DEd30Adc677',
			router: '0x6E055FfA786Dfe9DBB214b649a9b2A169e6B820b',
		},
	},
	[bsc.id]: {
		[PoolType.PANCAKEV2]: {
			router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
		},
		[PoolType.PANCAKEV3]: {
			quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
			router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
		},
	},
}

export function getPeriphery(
	chainId: number,
	poolType: PoolType,
): UniV3PoolPeriphery | UniV2PoolPeriphery | undefined {
	return CHAIN_PERIPHERY_CONFIG[chainId]?.[poolType]
}
