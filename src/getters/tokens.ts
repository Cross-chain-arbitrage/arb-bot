import axios from "axios";
import { getApiUrl } from "../utils/apiUrl";

// Updated StargateToken interface
export interface StargateToken {
	chainKey: string;
	address?: string;
	decimals: number;
	symbol: string;
	name?: string;
	price: {
		usd: number;
	};
}

// Function to fetch tokens from the API
export async function getStargateTokens(
	includeLPs: boolean = false
): Promise<StargateToken[]> {
	try {
		const apiUrl = getApiUrl();

		const response = await axios.get<{ tokens: StargateToken[] }>(
			`${apiUrl}/tokens`
		);

		if (!includeLPs) {
			return response.data.tokens.filter(
				(token) => !token.name?.includes("LP") && !token.symbol?.includes("S*")
			);
		}

		console.log("Total tokens:", response.data.tokens.length);

		return response.data.tokens;
	} catch (error) {
		console.error("Error fetching tokens:", error);
		return [];
	}
}
