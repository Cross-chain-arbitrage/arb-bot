import { Address } from 'viem'
// import { LAYER_ZERO_CHAINS } from "./deployments"

interface AddressObject {
	address: string
}

interface LayerZeroChainDeployment {
	eid: string
	[key: string]: AddressObject | string | number
}

interface LayerZeroChainDetails {
	mainnetChainName?: string
	name?: string
	shortName?: string
	chainType: string
	chainKey: string
	chainStatus: string
	chainStack?: string
	nativeChainId: number
	chainLayer: string
	cgNetworkId?: string
	nativeCurrency: {
		name?: string
		symbol: string
		cgId?: string
		cmcId?: number
		decimals: number
	}
}

interface LayerZeroChainDVN {
	version: number
	canonicalName: string
	id: string
	deprecated?: boolean
}

export interface LayerZeroChain {
	deployments: LayerZeroChainDeployment[]
	chainDetails: LayerZeroChainDetails
	chainKey: string
	dvns: Record<Address, LayerZeroChainDVN>
	blockExplorers: { url: string }[]
}

const CHAINID_TO_EID = {
	1: 30101, // Ethereum
	56: 30102, // BSC
	137: 30109, // Polygon
	42161: 30110, // Arbitrum
	10: 30111, // Optimism
	8453: 30184, // Base
	122: 30138, // Fuse
	43111: 30329, // Hemi
	1890: 30309, // Lightlink
	1514: 30364, // Story
}

export function getChainEIdByNativeChainId(chainId: number) {
	const eId = CHAINID_TO_EID[chainId as keyof typeof CHAINID_TO_EID]

	if (!eId) {
		throw new Error(`Chain ID ${chainId} not found in CHAINID_TO_EID`)
	}
	return eId
}
