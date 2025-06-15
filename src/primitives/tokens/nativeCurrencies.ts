import * as chains from 'viem/chains'
import { NativeCurrency } from './NativeCurrency'

const ETH = (chainId: number) => new NativeCurrency(chainId, 'ETH', 'ETH')

export const NATIVE_CURRENCIES: Record<number, NativeCurrency> = {
	[chains.arbitrum.id]: ETH(chains.arbitrum.id),
	[chains.fuse.id]: new NativeCurrency(chains.fuse.id, 'FUSE', 'FUSE'),
	[chains.hemi.id]: ETH(chains.hemi.id),
	[chains.lightlinkPhoenix.id]: ETH(chains.lightlinkPhoenix.id),
} as const
