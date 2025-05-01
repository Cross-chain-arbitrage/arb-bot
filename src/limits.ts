import { getStablecoinOnStargate, Stablecoin } from "./getters/stablecoins";
import { getStargateRoutes, Route } from "./route";
import * as fs from "fs";
import * as path from "path";

interface BridgingRoute {
	route: string;
	limit: number;
	decimals?: number;
}

const RANDOM_ADDRESS = "0x0000000000000000000000000000000000000001";

async function getBridgingRoutes(
	stablecoin: Stablecoin
): Promise<{ [symbol: string]: BridgingRoute[] }> {
	const routesMap: { [symbol: string]: BridgingRoute[] } = {};

	console.log("Stablecoin:", stablecoin);
	routesMap[stablecoin.symbol] = await getAllRouterForToken(stablecoin);

	return routesMap;
}

async function getAllRouterForToken(
	stablecoin: Stablecoin
): Promise<BridgingRoute[]> {
	const routes: BridgingRoute[] = [];
	const batchSize = 5; // Define the batch size

	for (let i = 0; i < stablecoin.chains.length; i++) {
		const totalAmountOfRoutes =
			stablecoin.chains.length * stablecoin.chains.length;

		const batchPromises: any[] = [];

		for (let j = 0; j < stablecoin.chains.length; j++) {
			const srcChain = stablecoin.chains[i];
			const dstChain = stablecoin.chains[j];

			// if (srcChain.chainKey !== 'ethereum') continue

			// Skip if the source and destination chains are the same
			if (srcChain.chainKey === dstChain.chainKey) {
				console.log(
					`${srcChain.chainKey} -> ${dstChain.chainKey}`,
					`(${stablecoin.chains.length * i + j} / ${totalAmountOfRoutes})`
				);
				continue;
			}

			const srcAddress = srcChain.address;
			const dstAddress = dstChain.address;

			console.log(
				`${srcChain.chainKey} -> ${dstChain.chainKey}`,
				`(${stablecoin.chains.length * i + j} / ${totalAmountOfRoutes})`
			);

			const promise = getStargateRoutes(
				{
					srcToken: srcAddress,
					dstToken: dstAddress,
					srcAddress: RANDOM_ADDRESS,
					dstAddress: RANDOM_ADDRESS,
					srcChainKey: srcChain.chainKey,
					dstChainKey: dstChain.chainKey,
					srcAmount: 100000000,
					dstAmountMin: 1,
				},
				"taxi"
			);

			batchPromises.push(promise);

			// Process in batches
			if (batchPromises.length >= batchSize) {
				const results = (await Promise.all(batchPromises)) as Route[][];

				for (const result of results) {
					if (Object.keys(result).length === 0) continue;

					const route: BridgingRoute = {
						route: `${result[0].srcChainKey} -> ${result[0].dstChainKey}`,
						limit: Number(result[0]?.srcAmountMax) || 0,
						decimals: stablecoin.chains.find(
							(chain) => chain.chainKey === result[0].srcChainKey
						)?.decimals,
					};

					routes.push(route);
				}

				batchPromises.length = 0; // Clear the batch
			}
		}

		// Process any remaining promises
		if (batchPromises.length > 0) {
			await Promise.all(batchPromises);
		}
	}

	return routes;
}

export async function getStablecoinAndRoutes(symbol: string) {
	const stablecoin = await getStablecoinOnStargate(symbol);

	if (!stablecoin) throw new Error(`Stablecoin ${symbol} not found`);

	const routes = await getBridgingRoutes(stablecoin);

	return { stablecoin, routes };
}

// Run the function
async function main() {
	const symbol = "USDC";

	const { stablecoin, routes } = await getStablecoinAndRoutes(symbol);
	console.log("Identified stablecoins and their bridging routes:");

	console.log("Bridging routes and limits:");
	for (const [symbol, routesList] of Object.entries(routes)) {
		console.log(`${symbol}:`);
		for (const route of routesList) {
			console.log(`  ${route.route}, Limit - ${route.limit}`);
		}
	}

	const outputPath = path.join("./data/routes", `${symbol}.json`);

	fs.writeFileSync(outputPath, JSON.stringify(routes, null, 4), "utf-8");
	console.log(`Routes have been recorded to ${outputPath}`);

	console.log("Total stablecoin chains:", stablecoin.chains.length);
}

main();
