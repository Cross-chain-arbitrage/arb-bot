import { mainnet } from 'viem/chains'

export const peripheryAddresses: Record<number, UniV2PoolPeriphery> = {
	[mainnet.id]: {
		router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
	},
}
