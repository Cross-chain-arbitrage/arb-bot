import axios from "axios"
import { Token } from "../utils/token"
import dotenv from "dotenv"
import { isValidUrl } from "../utils/validation"

dotenv.config()

interface Response {
	data: { v1: undefined; v2: StargateTokenMetadata[] }
}

export class StargateAPI {
	private static getApiUrl(): string {
		const apiUrl = process.env.STARGATE_API_URL

		if (!apiUrl || !isValidUrl(apiUrl)) {
			throw new Error("STARGATE_API_URL is not a valid URL")
		}

		return apiUrl
	}

	// Function to fetch tokens from the API
	static async getStargateTokensMetadata(
		chainKey: string = "",
	): Promise<StargateTokenMetadata[]> {
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

	static async getStargateTokenMetadata(
		token: Token,
		chainKey: string,
	): Promise<StargateTokenMetadata> {
		const metadata = await this.getStargateTokensMetadata(chainKey)

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
}
