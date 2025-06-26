import { arbitrum, base, bsc, fuse, mainnet, optimism } from 'viem/chains'

export const FUSE_BRIDGE_SUPPORTED_CHAINS: number[] = [
	arbitrum.id,
	optimism.id,
	bsc.id,
	fuse.id,
	base.id,
	mainnet.id,
]
