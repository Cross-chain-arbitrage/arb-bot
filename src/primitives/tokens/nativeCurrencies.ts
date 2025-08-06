import * as chains from 'viem/chains'

export const ETH_METADATA = {
	symbol: 'ETH',
	name: 'ETH',
	decimals: 18,
}

function createMetadata(
	symbol: string,
	name: string,
	decimals = 18,
): TokenMetadata {
	return {
		symbol,
		name,
		decimals,
	}
}

export const NATIVE_CURRENCIES: Record<number, TokenMetadata> = {
	[chains.arbitrum.id]: ETH_METADATA,
	[chains.swellchain.id]: ETH_METADATA,
	[chains.base.id]: ETH_METADATA,
	[chains.hemi.id]: ETH_METADATA,
	[chains.lightlinkPhoenix.id]: ETH_METADATA,
	[chains.bob.id]: ETH_METADATA,
	[chains.fuse.id]: createMetadata('FUSE', 'FUSE', 18),
	[chains.story.id]: createMetadata('IP', 'IP', 18),
	[chains.bsc.id]: createMetadata('BNB', 'BNB', 18),
} as const
