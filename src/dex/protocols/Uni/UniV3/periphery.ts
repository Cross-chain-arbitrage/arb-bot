import { getAddress } from 'viem'
import {
	arbitrum,
	base,
	bob,
	hemi,
	lightlinkPhoenix,
	rootstock,
	story,
} from 'viem/chains'
import { RouterType } from '../../../base/bricks/uniV3Bricks'

export const UNIV3_PERIPHERY_CONFIG: Record<
	number,
	{
		[factoryAddress: Address]:
			| {
					router: Address
					quoter: Address
					routerType: RouterType.V1 | RouterType.V2
			  }
			| {
					router: Address
					quoter: Address
					routerType: RouterType.UNIVERSAL
					permit2: Address
			  }
	}
> = {
	[hemi.id]: {
		[getAddress('0x346239972d1fa486FC4a521031BC81bFB7D6e8a4')]: {
			quoter: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
			router: '0x864DDc9B50B9A0dF676d826c9B9EDe9F8913a160',
			routerType: RouterType.V2,
		},

		[getAddress('0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959')]: {
			quoter: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
			router: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
			routerType: RouterType.V1,
		},
	},
	[bob.id]: {
		[getAddress('0xcb2436774C3e191c85056d248EF4260ce5f27A9D')]: {
			quoter: '0x6Aa54a43d7eEF5b239a18eed3Af4877f46522BCA',
			router: '0x807F4E281B7A3B324825C64ca53c69F0b418dE40',
			routerType: RouterType.V2,
		},
	},
	[arbitrum.id]: {
		[getAddress('0x1F98431c8aD98523631AE4a59f267346ea31F984')]: {
			quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
			router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
			routerType: RouterType.V1,
		},
	},
	[story.id]: {
		// StoryHunt
		[getAddress('0xa111dDbE973094F949D78Ad755cd560F8737B7e2')]: {
			quoter: '0x1434Ae03CfA29d314da73fC18013CCd04f100af6',
			router: '0x1062916B1Be3c034C1dC6C26f682Daf1861A3909',
			routerType: RouterType.V1,
		},
		// PiperX
		[getAddress('0xb8c21e89983B5EcCD841846eA294c4c8a89718f1')]: {
			quoter: '0xe8CabF9d1FFB6CE23cF0a86641849543ec7BD7d5',
			router: '0x8295c195CEe31404ea082d253a140310b9a0A37e',
			routerType: RouterType.V1,
		},
	},
	[rootstock.id]: {
		[getAddress('0xaF37EC98A00FD63689CF3060BF3B6784E00caD82')]: {
			quoter: '0xb51727c996c68e60f598a923a5006853cd2feb31',
			router: '0x0b14ff67f0014046b4b99057aec4509640b3947a',
			routerType: RouterType.V1,
		},
	},
	[lightlinkPhoenix.id]: {
		[getAddress('0xcb2436774C3e191c85056d248EF4260ce5f27A9D')]: {
			quoter: '0x5911cB3633e764939edc2d92b7e1ad375Bb57649',
			router: '0xaa52bB8110fE38D0d2d2AF0B85C3A3eE622CA455',
			routerType: RouterType.V2,
		},
	},
	[base.id]: {
		[getAddress('0x33128a8fC17869897dcE68Ed026d694621f6FDfD')]: {
			quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
			router: '0x2626664c2603336E57B271c5C0b26F421741e481',
			routerType: RouterType.V2,
		},
	},
	[1300]: {
		[getAddress('0x6D709dA17b57d608bD13fd6607690cE78745BF47')]: {
			quoter: '0xbc31abF21573194DB8e763bC718FFaC3c91808bF',
			router: '0x219F3ef35307515c41eae6867AffB327033dD96b',
			routerType: RouterType.UNIVERSAL,
			permit2: '0xb615b6dcE9d01C7C512234387Cbb2249B07C193b',
		},
	},
}
