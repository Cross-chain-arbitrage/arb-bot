export const arbUrl = 'https://arb-mainnet.g.alchemy.com/v2/'
export const fuseUrl = 'https://fuse-mainnet.g.alchemy.com/v2/'

export function getAlchemyApiKey() {
	const apiKey = process.env.ALCHEMY_API_KEY
	if (!apiKey) {
		throw new Error('ALCHEMY_API_KEY is not set')
	}
	return apiKey
}
