import { bsc } from 'viem/chains'

export const peripheryAddresses: Record<number, UniV2PoolPeriphery> = {
	[bsc.id]: {
		router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
	},
}
