import axios from "axios";
import { getApiUrl } from "../utils/apiUrl";

export interface NativeCurrency {
	name: string;
	symbol: string;
	decimals: number;
	address?: string; // Optional, as it's only present for Aptos
}

export interface Chain {
	chainKey: string;
	chainType: "evm" | "aptos" | "solana";
	chainId: number;
	shortName: string;
	name: string;
	nativeCurrency: NativeCurrency;
}

export async function getStargateChains(): Promise<Chain[]> {
	const apiUrl = getApiUrl();

	try {
		const response = await axios.get<{ chains: Chain[] }>(`${apiUrl}/chains`);
		return response.data.chains;
	} catch (error) {
		console.error("Error fetching Stargate chains:", error);
		throw error;
	}
}
