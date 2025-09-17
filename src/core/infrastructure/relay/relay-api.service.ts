import { Injectable } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import {
	ExecutionFullStatusSchema,
	ExecutionStatusSchema,
} from './schemas/relay-execution-status.scheme'
import { QuoteEvmSrcSchema } from './schemas/relay-quite-evm-src.schema'
import { QuoteSolanaSrcSchema } from './schemas/relay-quite-solana-src.schema'

export type TradeType = 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'EXPECTED_OUTPUT'

const DEFAULT_SLIPPAGE_BP = 10
const DEFAULT_TRADE_TYPE: TradeType = 'EXACT_INPUT'

@Injectable()
export class RelayApiService {
	baseUrl = 'https://api.relay.link'
	client: AxiosInstance

	constructor() {
		this.client = axios.create({
			baseURL: this.baseUrl,
		})
	}

	async getQuote(params: {
		user: string
		recipient: string
		originChainId: number
		destinationChainId: number
		amount: number
		originCurrency: string
		destinationCurrency: string
		tradeType?: TradeType
		slippage?: number
	}) {
		const slippage = params.slippage ?? DEFAULT_SLIPPAGE_BP
		const tradeType = params.tradeType ?? DEFAULT_TRADE_TYPE

		const response = await this.client.post(`/quote`, {
			...params,
			slippage: slippage,
			tradeType: tradeType,
		})

		if (params.originChainId === SOLANA_RELAY_CHAIN_ID) {
			return QuoteSolanaSrcSchema.parse(response.data)
		}

		return QuoteEvmSrcSchema.parse(response.data)
	}

	async getExecutionStatus(requestId: string) {
		const response = await this.client.get(`/intents/status/v2`, {
			params: {
				requestId,
			},
		})

		const executionStatus = ExecutionStatusSchema.parse(response.data)

		if (executionStatus.status === 'waiting') {
			const waitingStatus: { status: 'waiting' } = {
				status: 'waiting',
			}

			return waitingStatus
		}

		return ExecutionFullStatusSchema.parse(response.data)
	}
}
