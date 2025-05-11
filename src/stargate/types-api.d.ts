type StargateTypes = "POOL" | "OFT" | "NATIVE"

enum StargateType {
	POOL = 0,
	OFT = 1,
	NATIVE = 2,
}

interface Response {
	data: { v1: undefined; v2: StargateTokenMetadata[] }
}

interface NativeCurrency {
	name: string
	symbol: string
	decimals: number
	address?: string // Optional, as it's only present for Aptos
}

interface StargateToken {
	isBridgeable: boolean
	chainKey: string
	address: string
	decimals: number
	symbol: string
	name?: string
	price: {
		usd: number
	}
}

interface Stablecoin {
	symbol: string
	address: Address
	chains: {
		name?: string
		chainKey: string
		address: string
		price: number
		decimals: number
	}[]
}

interface Chain {
	chainKey: string
	chainType: "evm" | "aptos" | "solana"
	chainId: number
	shortName: string
	name: string
	nativeCurrency: NativeCurrency
}

interface StargateTokenMetadata {
	stargateType: StargateTypes
	address: Address
	token: {
		address: Address
		decimals: number
		symbol: string
	}
	lpToken?: {
		address: Address
		decimals: number
		symbol: string
	}
	farm?: {
		stargateStaking?: {
			address: Address
			rewardTokens: {
				address: Address
				decimals: number
				symbol: string
			}[]
		}
	}
	id: string
	assetId: string
	chainKey: string
	chainName: string
	tokenMessaging: Address
	sharedDecimals: number
}

interface StargateChain {
	chainKey: string
	chainType: "evm" | "solana" | "tron" | "ton" | "aptos" | "hypercore"
	chainId: number
	shortName: string
	name: string
	nativeCurrency: {
		chainKey: string
		name: string
		symbol: string
		decimals: number
		address: string
	}
}
