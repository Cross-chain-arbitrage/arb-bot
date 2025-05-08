import axios from "axios"
import { getApiUrl } from "../utils/apiUrl"
import { Address } from "viem"
// Updated StargateToken interface
export interface StargateToken {
	isBridgeable: boolean
	chainKey: string
	address?: Address
	decimals: number
	symbol: string
	name?: string
	price: {
		usd: number
	}
}

// Function to fetch tokens from the API
export async function getStargateTokens(
	chainKey: string = "",
	includeLPs: boolean = false,
): Promise<StargateToken[]> {
	try {
		const apiUrl = getApiUrl()

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
