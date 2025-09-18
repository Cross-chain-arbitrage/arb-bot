export type RpcUrl = `http${string}`

export type RpcProviders = Record<number, (RpcUrl | 'alchemy')[]>

export type CustomChain = {
	chainId: number
	defaultRpcUrl: string
	chainName: string
	nativeCurrency: {
		name: string
		symbol: string
		decimals: number
	}
}

export interface ChainClientConfig {
	rpcProviders?: RpcProviders
	customChains?: CustomChain[]
}
