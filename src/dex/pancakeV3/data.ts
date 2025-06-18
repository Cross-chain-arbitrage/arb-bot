import { bsc } from 'viem/chains'

/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */
/*                                  USE QUOTER V2                                   */
/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */
export const peripheryAddresses: Record<number, PoolPeriphery | undefined> = {
	[bsc.id]: {
		quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
		router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
	},
}
