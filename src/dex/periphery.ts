import { getAddress } from 'viem'
import {
	arbitrum,
	bsc,
	fuse,
	gravity,
	hemi,
	lightlinkPhoenix,
	mainnet,
	rootstock,
	story,
	swellchain,
} from 'viem/chains'
import { PoolType } from './poolVariety'

type FactoryAddress = Address

export interface PoolPeriphery {
	[PoolType.UNIV3]?: Record<FactoryAddress, UniV3PoolPeriphery>
	[PoolType.UNIV2]?: Record<FactoryAddress, UniV2PoolPeriphery>
	[PoolType.PANCAKEV3]?: Record<FactoryAddress, UniV3PoolPeriphery>
	[PoolType.PANCAKEV2]?: Record<FactoryAddress, UniV2PoolPeriphery>
	[PoolType.ALGEBRA]?: Record<FactoryAddress, UniV3PoolPeriphery>
	[PoolType.ALGEBRA_V1_9]?: Record<FactoryAddress, UniV3PoolPeriphery>
	[PoolType.VELODROME_V2]?: Record<FactoryAddress, UniV2PoolPeriphery>
}

/**
 * @dev Factory address is used as a key to allow multiple DEXes of same type on same chain
 * @dev MUST be access using {@link Pool.getPeripherySafe} or {@link getAddress} (without chainId) for correct factory address comparison
 * @warning [getAddress(*factoryAddress*)] can lead to unexpected address comparison errors due to several existing checksum standards
 * @warning EIP-55 and EIP-1191 (uses chainId) checksum standards are not compatible with each other
 */
export const CHAIN_PERIPHERY_CONFIG: Record<number, PoolPeriphery> = {
	[mainnet.id]: {
		[PoolType.UNIV2]: {
			[getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f')]: {
				router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
			},
		},
	},
	[hemi.id]: {
		[PoolType.UNIV3]: {
			[getAddress('0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959')]: {
				quoter: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
				router: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
			},
		},
	},
	[arbitrum.id]: {
		[PoolType.UNIV3]: {
			[getAddress('0x1F98431c8aD98523631AE4a59f267346ea31F984')]: {
				quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
				router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
			},
		},
	},
	[story.id]: {
		[PoolType.UNIV3]: {
			// StoryHunt
			[getAddress('0xa111dDbE973094F949D78Ad755cd560F8737B7e2')]: {
				quoter: '0x1434Ae03CfA29d314da73fC18013CCd04f100af6',
				router: '0x1062916B1Be3c034C1dC6C26f682Daf1861A3909',
			},
			// PiperX
			[getAddress('0xb8c21e89983B5EcCD841846eA294c4c8a89718f1')]: {
				quoter: '0xe8CabF9d1FFB6CE23cF0a86641849543ec7BD7d5',
				router: '0x8295c195CEe31404ea082d253a140310b9a0A37e',
			},
		},
	},
	[rootstock.id]: {
		[PoolType.UNIV3]: {
			[getAddress('0xaF37EC98A00FD63689CF3060BF3B6784E00caD82')]: {
				quoter: '0xb51727c996c68e60f598a923a5006853cd2feb31',
				router: '0x0b14ff67f0014046b4b99057aec4509640b3947a',
			},
		},
	},
	[lightlinkPhoenix.id]: {
		[PoolType.UNIV3]: {
			[getAddress('0xcb2436774C3e191c85056d248EF4260ce5f27A9D')]: {
				quoter: '0x5911cB3633e764939edc2d92b7e1ad375Bb57649',
				router: '0xaa52bB8110fE38D0d2d2AF0B85C3A3eE622CA455',
				is02Router: true,
			},
		},
	},
	[fuse.id]: {
		[PoolType.ALGEBRA]: {
			[getAddress('0xccEdb990abBf0606Cf47e7C6A26e419931c7dc1F')]: {
				quoter: '0xF95978f3525eC2Bd1411f46A4cA64DEd30Adc677',
				router: '0x6E055FfA786Dfe9DBB214b649a9b2A169e6B820b',
			},
		},
	},
	[bsc.id]: {
		[PoolType.PANCAKEV2]: {
			[getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73')]: {
				router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
			},
		},
		[PoolType.PANCAKEV3]: {
			[getAddress('0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865')]: {
				quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
				router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
			},
		},
	},
	[gravity.id]: {
		[PoolType.ALGEBRA_V1_9]: {
			[getAddress('0x10aA510d94E094Bd643677bd2964c3EE085Daffc')]: {
				router: '0x60A186019F81bFD04aFc16c9C01804a04E79e68B',
				quoter: '0x52CFD1d72A64f8D13711bb7Dc3899653dbd4191B',
			},
		},
	},
	[swellchain.id]: {
		[PoolType.VELODROME_V2]: {
			// Velodrome Universal Router
			[getAddress('0x31832f2a97Fd20664D76Cc421207669b55CE4BC0')]: {
				router: '0x01D40099fCD87C018969B0e8D4aB1633Fb34763C',
			},
		},
	},
}
