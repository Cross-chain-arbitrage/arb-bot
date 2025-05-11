import dotenv from "dotenv"
import { getStargateRoutes, StargateRouteParams } from "./route"

// Load environment variables
dotenv.config()

enum Chains {
	ethereum = "ethereum",
	bsc = "bsc",
	avalanche = "avalanche",
	polygon = "polygon",
	arbitrum = "arbitrum",
	optimism = "optimism",
	metis = "metis",
	linea = "linea",
	mantle = "mantle",
	base = "base",
	kava = "kava",
	scroll = "scroll",
	aurora = "aurora",
	sei = "sei",
	zksync = "zksync",
	klaytn = "klaytn",
	solana = "solana",
	iota = "iota",
}

const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

// Example usage
async function main() {
	const routeParams: StargateRouteParams = {
		srcToken: NATIVE,
		dstToken: NATIVE,
		srcAddress: "0x0000000000000000000000000000000000000001",
		dstAddress: "0x0000000000000000000000000000000000000001",
		srcChainKey: Chains.arbitrum,
		dstChainKey: Chains.optimism,
		srcAmount: 1000000,
		dstAmountMin: 3,
	}

	try {
		const routes = await getStargateRoutes(routeParams, "taxi")
		console.log("Stargate routes:")
		routes.forEach((route, index) => {
			console.log(`Route ${index + 1}:`)
			console.log(`  Name: ${route.name}`)
			console.log(`  Mode: ${route.mode}`)
			console.log(`  Source Chain: ${route.srcChainKey}`)
			console.log(`  Destination Chain: ${route.dstChainKey}`)
			console.log(`  Source Token: ${route.srcToken}`)
			console.log(`  Destination Token: ${route.dstToken}`)
			console.log(`  Source Amount: ${route.srcAmount}`)
			console.log(`  Source Amount Max: ${route.srcAmountMax}`)
			console.log(`  Destination Amount: ${route.dstAmount}`)
			console.log(`  Destination Amount Min: ${route.dstAmountMin}`)
			console.log(`  Duration: ${route.duration} seconds`)
			console.log(`  Message Fee: ${route.messageFee} wei`)
			console.log(`  Allowance: ${route.allowance}`)
			console.log(`  Destination Native Amount: ${route.dstNativeAmount}`)
			if (route.dstNativeAmountMax) {
				console.log(
					`  Destination Native Amount Max: ${route.dstNativeAmountMax}`,
				)
			}
			console.log(`  Error: ${route.error || "None"}`)
			console.log("---")
		})
	} catch (error) {
		console.error("Failed to fetch Stargate routes:", error)
	}
}

main().catch(console.error)
