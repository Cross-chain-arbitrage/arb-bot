import assert from "assert"
import { getStargateChains } from "./getters/chains"
import { getStargateTokens } from "./getters/tokens"

async function main() {
	const allChains = await getStargateChains()
	const tokens = await getStargateTokens()

	const chainsToMap = ["hemi", "fuse", "ape", "lightlink", "degen"]

	const chains = allChains.filter((chain) =>
		chainsToMap.includes(chain.chainKey),
	)

	assert(
		chains.length === chainsToMap.length,
		"Expected " +
			chainsToMap.length +
			" chains, found only " +
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
