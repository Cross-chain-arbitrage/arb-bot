import path from "path";
import { getStablecoinsOnStargate } from "./getters/stablecoins";
import fs from "fs";

async function main() {
	const stablecoins = await getStablecoinsOnStargate();
	console.log("Identified stablecoins:");

	stablecoins.forEach((coin) => {
		console.log(`${coin.symbol}:`);
		console.table(
			coin.chains.map((chain) => ({
				"Chain Key": chain.chainKey,
				Address: `${chain.address.slice(0, 6)}...${chain.address.slice(-4)}`,
				Price: `$${chain.price}`,
				Name: chain.name,
				"Full Address": chain.address,
			}))
		);
		console.log(); // Add an empty line for better readability between coins
	});

	console.log("Total stablecoins:", stablecoins.length);

	// Write data to JSON file

	const outputPath = path.join("./data/tokens", "stablecoins.json");
	fs.writeFileSync(outputPath, JSON.stringify(stablecoins, null, 4), "utf-8");
	console.log(`Stablecoins data has been written to ${outputPath}`);
}

main().catch((error) => {
	console.error("Error identifying stablecoins:", error);
});
