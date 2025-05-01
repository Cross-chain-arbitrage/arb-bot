import { getStargateTokens, StargateToken } from "./tokens";

export interface Stablecoin {
	symbol: string;
	chains: {
		name?: string;
		chainKey: string;
		address: string;
		price: number;
		decimals: number;
	}[];
}

function getTokenSymbol(token: StargateToken) {
	const usdtAnalogs = ["USDT", "USDt", "m.USDT"];

	if (usdtAnalogs.includes(token.symbol)) {
		return "USDT";
	}

	if (token.symbol === "USDC.e" && token.name?.includes("Stargate"))
		return "USDC";

	const avalancheBridgedUSDC = [
		"0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // arbitrum
		"0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // optimism
		"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // polygon
	];

	if (avalancheBridgedUSDC.includes(token.address || "")) {
		return "USDC.e";
	}

	return token.symbol;
}

export async function getStablecoinsOnStargate() {
	const tokens = await getStargateTokens();

	const stablecoins = filterStablecoins(tokens);

	return stablecoins;
}

export async function getStablecoinOnStargate(
	symbol: string
): Promise<Stablecoin | undefined> {
	const tokens = await getStargateTokens();

	const stablecoins = filterStablecoins(tokens);

	return stablecoins.find((coin) => coin.symbol === symbol);
}

function filterStablecoins(tokens: StargateToken[]) {
	const stablecoinMap: { [symbol: string]: Stablecoin } = {};

	for (const token of tokens) {
		const stableName = getTokenSymbol(token);

		if (!token.price?.usd) {
			// console.log('No price for', token.symbol, token.chainKey)
			continue;
		}

		// Check if the token price is within a small range of $1
		if (!token.price?.usd) continue;
		// Aptos is supported only in Stargate V1
		if (token.chainKey === "aptos") continue;

		const priceInUSD = parseFloat(token.price.usd.toString());
		const lowerBound = 0.98;
		const upperBound = 1.02;

		// Consider a token a stablecoin if its price is between $0.98 and $1.02
		if (priceInUSD >= lowerBound && priceInUSD <= upperBound) {
			if (!stablecoinMap[stableName]) {
				stablecoinMap[stableName] = {
					symbol: stableName,
					chains: [],
				};
			}

			if (!stablecoinMap[stableName].chains) {
				stablecoinMap[stableName].chains = [];
			}

			stablecoinMap[stableName].chains.push({
				chainKey: token.chainKey,
				address: token.address || "",
				price: token.price.usd,
				decimals: token.decimals,
				name: token.name,
			});
		}
	}

	return Object.values(stablecoinMap);
}
