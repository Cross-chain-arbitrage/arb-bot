import { arbitrum, bsc, mainnet, story } from 'viem/chains'

export function getAlchemyApiKey() {
	const apiKey = process.env.ALCHEMY_API_KEY
	if (!apiKey) {
		throw new Error('ALCHEMY_API_KEY is not set')
	}
	return apiKey
}

export function getAlchemyRpcUrl(chainId: number) {
	const apiKey = getAlchemyApiKey()
	let chainKey = ''
	switch (chainId) {
		case arbitrum.id:
			chainKey = 'arb-mainnet'
			break
		case mainnet.id:
			chainKey = 'eth-mainnet'
			break
		case bsc.id:
			chainKey = 'bnb-mainnet'
			break
		case story.id:
			chainKey = 'story-mainnet'
			break
	}

	return `https://${chainKey}.g.alchemy.com/v2/${apiKey}`
}
