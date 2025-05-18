import assert from 'assert'
import { StargateAPI } from '../StargateAPI'

async function main() {
	const allChains = await StargateAPI.getChains()
	const tokens = await StargateAPI.getTokens()

	const chainsToMap = ['hemi', 'fuse', 'ape', 'lightlink', 'degen']

	const chains = allChains.filter((chain) =>
		chainsToMap.includes(chain.chainKey),
	)

	assert(
		chains.length === chainsToMap.length,
		'Expected ' +
			chainsToMap.length +
			' chains, found only ' +
			chains.length,
	)

	console.table(chains)

	const tokensByChains = chains.map((chain) => {
		return {
			chainKey: chain.chainKey,
			tokens: tokens
				.filter((token) => token.chainKey === chain.chainKey)
				.map((token) => {
					return {
						symbol: token.symbol,
						address: token.address,
						decimals: token.decimals,
					}
				}),
		}
	})

	// // Write to a table
	console.log(JSON.stringify(tokensByChains, null, 4))
}

main().catch(console.error)
