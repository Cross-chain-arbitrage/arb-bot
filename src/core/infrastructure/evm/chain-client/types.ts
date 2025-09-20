export type RpcUrl = `http${string}`
export type ChainRpcSettings = {
	rpcUrls: (RpcUrl | 'alchemy')[]
	disableDefaultRpcUrl: boolean
}
export type RpcSettings = Record<string, ChainRpcSettings>

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
	rpcSettings?: RpcSettings
	customChains?: CustomChain[]
}
