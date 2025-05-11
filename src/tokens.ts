import path from "path"
import { getStargateTokens } from "./getters/tokens"
import fs from "fs"

async function displayTokens() {
	const tokens = await getStargateTokens()

	// tokens.forEach((token) => {
	// 	console.log(
	// 		`${token.symbol} (${token.chainKey}): $${token.price.usd?.toFixed(3)}`
	// 	);
	// });

	// Write tokens data to JSON file
	const outputPath = path.join("./", "data", "tokens", "tokens.json")
	fs.writeFileSync(outputPath, JSON.stringify(tokens, null, 4), "utf-8")
	console.log(`Tokens data has been written to ${outputPath}`)

	console.log("Total tokens:", tokens.length)
}

// Export the functions and types
displayTokens().catch(console.error)
