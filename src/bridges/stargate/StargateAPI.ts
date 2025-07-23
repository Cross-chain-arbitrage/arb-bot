import TTLCache from '@isaacs/ttlcache'
import axios from 'axios'
import { isAddressEqual } from 'viem'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { createCustomError } from '../../utils/common'
import { getStargateChainKey } from './helpers'

export const StargateAPIError = createCustomError('StargateAPIError')

const STARGATE_API_URL = new URL('https://mainnet.stargate-api.com/v1')

type RequestId = string

export class StargateAPI {
	constructor(private readonly tokenUtils: TokenUtils) {}
	private cache = new TTLCache<RequestId, StargateTokenMetadata[]>({
		ttl: 1000 * 60 * 60 * 24, // 24 hours
	})

	async getAllTokensMetadata(): Promise<StargateTokenMetadata[]> {
		const REQUEST_ID = 'metadata-v2'

		const cachedMetadata = this.cache.get(REQUEST_ID)

		if (cachedMetadata) return cachedMetadata

		try {
			const response = await axios.get<Response>(
				`${STARGATE_API_URL}/metadata?version=v2`,
			)

			const metadata = response.data.data.v2

			this.cache.set(REQUEST_ID, metadata)

			return metadata
		} catch (error) {
			console.error('Error fetching metadata:', error)
			return []
		}
	}

	// Function to fetch tokens from the API
	async getTokensMetadataOnChain(
		chainId: number,
	): Promise<StargateTokenMetadata[]> {
		const chainKey = getStargateChainKey(chainId)

		const metadata = await this.getAllTokensMetadata()

		return metadata.filter((metadata) => metadata.chainKey === chainKey)
	}

	async getTokenMetadata(
		token: Token | NativeCurrency,
	): Promise<StargateTokenMetadata> {
		const metadata = await this.getAllTokensMetadata()

		const chainKey = getStargateChainKey(token.chainId)

		const tokenMetadata = metadata.find(
			(metadata) =>
				isAddressEqual(metadata.token.address, token.address) &&
				metadata.chainKey === chainKey,
		)

		if (!tokenMetadata) {
			throw new StargateAPIError(
				`Token ${token.address} not found in Stargate metadata for chain ${chainKey}`,
			)
		}

		return tokenMetadata
	}

	async getSameAssetMetadataAcrossChains(
		token: Token | NativeCurrency,
	): Promise<StargateTokenMetadata[]> {
		const metadata = await this.getAllTokensMetadata()

		const asset = metadata.find(
			(metadata) =>
				isAddressEqual(metadata.token.address, token.address) &&
				metadata.chainKey === getStargateChainKey(token.chainId),
		)

		if (!asset) {
			throw new StargateAPIError(
				`Token ${token.address} not found in Stargate metadata`,
			)
		}

		const assetId = asset.assetId

		return metadata.filter((metadata) => metadata.assetId === assetId)
	}

	async getTokensOnChain(chainId: number) {
		const metadata = await this.getTokensMetadataOnChain(chainId)
		const tokenData = metadata.map((token) => token.token)

		const tokens = tokenData.map((token) =>
			this.tokenUtils.fromAddress(token.address, chainId),
		)

		return Promise.all(tokens)
	}
}
