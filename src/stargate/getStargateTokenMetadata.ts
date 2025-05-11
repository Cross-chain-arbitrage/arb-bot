
import axios from "axios"
import { getApiUrl } from "../utils/apiUrl"
import { Token } from "../utils/token"
import { StargateTokenMetadata } from "./metadata"

interface Response {
	data: { v1: undefined; v2: StargateTokenMetadata[] }
}

// Function to fetch tokens from the API
export async function getStargateTokensMetadata(
	chainKey: string = "",
): Promise<StargateTokenMetadata[]> {
	try {
		const apiUrl = getApiUrl()

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

export async function getStargateTokenMetadata(
	token: Token,
	chainKey: string,
): Promise<StargateTokenMetadata> {
	const metadata = await getStargateTokensMetadata(chainKey)

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
