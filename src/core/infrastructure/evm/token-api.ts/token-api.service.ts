import { Injectable } from '@nestjs/common'
import axios from 'axios'
import { TokenMetadata } from '../../../domain/entities/token'
import { TokenDataSchema } from './schemas/token-data.schema'

@Injectable()
export class TokenApiService {
	private readonly baseUrl: string

	constructor() {
		this.baseUrl = process.env.TOKEN_API_URL as string
	}

	async getTokenMetadata(
		address: Address,
		chainId: number,
		rpcUrl: string,
	): Promise<TokenMetadata> {
		const body = {
			rpc_url: rpcUrl,
		}

		const response = await axios.post(
			`${this.baseUrl}/tokens/evm/${chainId}/${address}`,
			body,
		)

		const { symbol, name, decimals } = TokenDataSchema.parse(response.data)

		return {
			symbol,
			name,
			decimals,
		}
	}
}
