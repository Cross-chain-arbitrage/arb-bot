type StargateTypes = "POOL" | "OFT" | "NATIVE"

enum StargateType {
	POOL = 0,
	OFT = 1,
	NATIVE = 2,
}

interface Response {
	data: { v1: undefined; v2: StargateTokenMetadata[] }
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
