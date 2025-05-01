import path from "path";
import { getStargateChains } from "./getters/chains";
import fs from "fs";

// Example usage (can be commented out or removed in production)
getStargateChains()
	.then((chains) => {
		console.log("Stargate Supported Chains:");
		chains.forEach((chain) => {
			console.log(`- ${chain.name} (${chain.chainKey}):`);
			console.log(`  Native Chain ID: ${chain.chainId}`);
			console.log(`  Chain Type: ${chain.chainType}`);
			console.log(
				`  Native Currency: ${chain.nativeCurrency.symbol} (${chain.nativeCurrency.name})`
			);
			console.log("---");
		});

		const outputPath = path.join("./data", "chains.json");
		fs.writeFileSync(outputPath, JSON.stringify(chains, null, 4), "utf-8");
		console.log(`Chains data has been written to ${outputPath}`);
	})
	.catch((error) => {
		console.error("Failed to fetch Stargate chains:", error);
	});
