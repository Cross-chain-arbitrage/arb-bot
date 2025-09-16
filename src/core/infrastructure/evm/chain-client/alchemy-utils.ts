const chainIdToChainKey: Record<number, string | undefined> = {
	1: 'eth-mainnet',
	10: 'opt-mainnet',
	30: 'rootstock-mainnet',
	31: 'rootstock-testnet',
	56: 'bnb-mainnet',
	97: 'bnb-testnet',
	100: 'gnosis-mainnet',
	130: 'unichain-mainnet',
	137: 'polygon-mainnet',
	146: 'sonic-mainnet',
	204: 'opbnb-mainnet',
	232: 'lens-mainnet',
	250: 'fantom-mainnet',
	252: 'frax-mainnet',
	300: 'zksync-sepolia',
	324: 'zksync-mainnet',
	360: 'shape-mainnet',
	480: 'worldchain-mainnet',
	545: 'flow-testnet',
	592: 'astar-mainnet',
	747: 'flow-mainnet',
	1088: 'metis-mainnet',
	1101: 'polygonzkevm-mainnet',
	1301: 'unichain-sepolia',
	1315: 'story-aeneid',
	1328: 'sei-testnet',
	1329: 'sei-mainnet',
	1514: 'story-mainnet',
	1868: 'soneium-mainnet',
	1946: 'soneium-minato',
	2020: 'ronin-mainnet',
	2021: 'ronin-saigon',
	2442: 'polygonzkevm-cardona',
	2741: 'abstract-mainnet',
	3636: 'botanix-testnet',
	3637: 'botanix-mainnet',
	4157: 'crossfi-testnet',
	4158: 'crossfi-mainnet',
	4801: 'worldchain-sepolia',
	5000: 'mantle-mainnet',
	5003: 'mantle-sepolia',
	5330: 'superseed-mainnet',
	5371: 'settlus-mainnet',
	5373: 'settlus-septestnet',
	5611: 'opbnb-testnet',
	6900: 'anime-sepolia',
	7000: 'zetachain-mainnet',
	7001: 'zetachain-testnet',
	8453: 'base-mainnet',
	10143: 'monad-testnet',
	10200: 'gnosis-chiado',
	10218: 'tea-sepolia',
	11011: 'shape-sepolia',
	11124: 'abstract-testnet',
	17000: 'eth-holesky',
	33111: 'apechain-curtis',
	33139: 'apechain-mainnet',
	37111: 'lens-sepolia',
	42161: 'arb-mainnet',
	42170: 'arbnova-mainnet',
	42220: 'celo-mainnet',
	43113: 'avax-fuji',
	43114: 'avax-mainnet',
	44787: 'celo-alfajores',
	53302: 'superseed-sepolia',
	57054: 'sonic-blaze',
	57073: 'ink-mainnet',
	59141: 'linea-sepolia',
	59144: 'linea-mainnet',
	69000: 'anime-mainnet',
	80002: 'polygon-amoy',
	80069: 'berachain-bepolia',
	80094: 'berachain-mainnet',
	81457: 'blast-mainnet',
	84532: 'base-sepolia',
	421614: 'arb-sepolia',
	534351: 'scroll-sepolia',
	534352: 'scroll-mainnet',
	560048: 'eth-hoodi',
	685685: 'gensyn-testnet',
	763373: 'ink-sepolia',
	6985385: 'humanity-mainnet',
	7777777: 'zora-mainnet',
	11155111: 'eth-sepolia',
	11155420: 'opt-sepolia',
	11155931: 'rise-testnet',
	168587773: 'blast-sepolia',
	241320161: 'xmtp-testnet',
	666666666: 'degen-mainnet',
	994873017: 'lumia-prism',
	999999999: 'zora-sepolia',
	1952959480: 'lumia-testnet',
}

export function getAlchemyApiKey() {
	const apiKey = process.env.ALCHEMY_API_KEY
	if (!apiKey) {
		throw new Error('ALCHEMY_API_KEY is not set')
	}
	return apiKey
}

export function getAlchemyRpcUrl(chainId: number) {
	const apiKey = getAlchemyApiKey()

	const chainKey = chainIdToChainKey[chainId]

	if (!chainKey) {
		throw new Error(`Chain ID ${chainId} not found in alchemy networks`)
	}

	return `https://${chainKey}.g.alchemy.com/v2/${apiKey}` as const
}
