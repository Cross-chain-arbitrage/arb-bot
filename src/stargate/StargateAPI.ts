import axios from "axios"
import { Token } from "../utils/tokens/Token"
import dotenv from "dotenv"
import { isValidUrl } from "../utils/validation"
import { STARGATE_CHAINS } from "./dumped/chains"
import { NativeCurrency } from "../utils/tokens/NativeCurrency"

dotenv.config()

export class StargateAPIError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, StargateAPIError.prototype)
		this.name = "StargateAPIError"
	}
}

export class StargateAPI {
	private static getApiUrl(): string {
		const apiUrl = process.env.STARGATE_API_URL

		if (!apiUrl || !isValidUrl(apiUrl)) {
			throw new StargateAPIError("STARGATE_API_URL is not a valid URL")
		}

		return apiUrl
	}

	// Function to fetch tokens from the API
	static async getTokensMetadata(
		chainKey: string = "",
	): Promise<StargateTokenMetadata[]> {
		this.validateChainKey(chainKey)

		try {
			const apiUrl = this.getApiUrl()

			const response = await axios.get<Response>(
				`${apiUrl}/metadata?version=v2`,
			)

			let metadata = response.data.data.v2

			if (chainKey) {
				metadata = metadata.filter(
					(metadata) => metadata.chainKey === chainKey,
				)
			}

			return metadata
		} catch (error) {
			console.error("Error fetching metadata:", error)
			return []
		}
	}

	static async getTokenMetadata(
		token: Token | NativeCurrency,
		chainKey: string,
	): Promise<StargateTokenMetadata> {
		this.validateChainKey(chainKey)

		const metadata = await this.getTokensMetadata(chainKey)

		const tokenMetadata = metadata.find(
			(metadata) =>
				metadata.token.address === token.address &&
				metadata.chainKey === chainKey,
		)

		if (!tokenMetadata) {
			throw new Error(
				`Token ${token.address} not found in Stargate metadata for chain ${chainKey}`,
			)
		}

		return tokenMetadata
	}

	static async getChains() {
		const apiUrl = this.getApiUrl()

		try {
			const response = await axios.get<{ chains: Chain[] }>(
				`${apiUrl}/chains`,
			)
			return response.data.chains
		} catch (error) {
			console.error("Error fetching Stargate chains:", error)
			throw error
		}
	}

	static async getTokens(
		chainKey: string = "",
		includeLPs: boolean = false,
	): Promise<StargateToken[]> {
		try {
			const apiUrl = this.getApiUrl()

			const response = await axios.get<{ tokens: StargateToken[] }>(
				`${apiUrl}/tokens`,
			)

			let tokens = response.data.tokens

			if (chainKey) {
				tokens = tokens.filter((token) => token.chainKey === chainKey)
			}

			if (!includeLPs) {
				tokens = tokens.filter(
					(token) =>
						!token.name?.includes("LP") &&
						!token.symbol?.includes("S*"),
				)
			}

			console.log("Total tokens:", tokens.length)

			return tokens
		} catch (error) {
			console.error("Error fetching tokens:", error)
			return []
		}
	}

	static async getStablecoinsOnStargate() {
		const tokens = await this.getTokens()

		const stablecoins = this.filterStablecoins(tokens)

		return stablecoins
	}

	static async getStablecoinOnStargate(
		symbol: string,
	): Promise<Stablecoin | undefined> {
		const tokens = await this.getTokens()

		const stablecoins = this.filterStablecoins(tokens)

		return stablecoins.find((coin) => coin.symbol === symbol)
	}

	private static filterStablecoins(tokens: StargateToken[]): Stablecoin[] {
		const stablecoinMap: { [symbol: string]: Stablecoin } = {}

		for (const token of tokens) {
			const stableName = this.getTokenSymbol(token)

			if (!token.price?.usd) {
				// console.log('No price for', token.symbol, token.chainKey)
				continue
			}

			// Check if the token price is within a small range of $1
			if (!token.price?.usd) continue
			// Aptos is supported only in Stargate V1
			if (token.chainKey === "aptos") continue

			const priceInUSD = parseFloat(token.price.usd.toString())
			const lowerBound = 0.98
			const upperBound = 1.02

			// Consider a token a stablecoin if its price is between $0.98 and $1.02
			if (priceInUSD >= lowerBound && priceInUSD <= upperBound) {
				if (!stablecoinMap[stableName]) {
					stablecoinMap[stableName] = {
						symbol: stableName,
						chains: [],
						address: "",
					}
				}

				if (!stablecoinMap[stableName].chains) {
					stablecoinMap[stableName].chains = []
				}

				stablecoinMap[stableName].chains.push({
					chainKey: token.chainKey,
					address: token.address,
					price: token.price.usd,
					decimals: token.decimals,
					name: token.name,
				})
			}
		}

		return Object.values(stablecoinMap)
	}

	private static getTokenSymbol(token: StargateToken) {
		const usdtAnalogs = ["USDT", "USDt", "m.USDT"]

		if (usdtAnalogs.includes(token.symbol)) {
			return "USDT"
		}

		if (token.symbol === "USDC.e" && token.name?.includes("Stargate"))
			return "USDC"

		const avalancheBridgedUSDC = [
			"0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // arbitrum
			"0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // optimism
			"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // polygon
		]

		if (token.address && avalancheBridgedUSDC.includes(token.address)) {
			return "USDC.e"
		}

		return token.symbol
	}

	private static validateChainKey(chainKey: string) {
		if (
			chainKey &&
			!STARGATE_CHAINS.some((chain) => chain.chainKey === chainKey)
		) {
			throw new StargateAPIError(`Invalid Stargate chainKey: ${chainKey}`)
		}
	}
}
