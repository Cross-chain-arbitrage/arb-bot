import { Injectable } from '@nestjs/common'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import axios, { AxiosInstance } from 'axios'
import { SolanaClientService } from '../solana/solana-client.service'
import { SolanaCurrency } from '../solana/solana-tokens/solana-currency'
import {
	UltraQuote,
	UltraQuoteSchema,
	UltraQuoteWithTx,
	UltraQuoteWithTxSchema,
} from './schemas/ultra-quote.schema'

const AVERAGE_UNITS_CONSUMPTION = 200_000
const PUBLIC_API_URL = 'https://lite-api.jup.ag'
const PRIVATE_API_URL = 'https://api.jup.ag'

@Injectable()
export class JupiterService {
	axiosClient: AxiosInstance

	constructor(private readonly solanaClientService: SolanaClientService) {
		const apiKey = process.env.JUPITER_API_KEY

		if (apiKey === undefined) {
			this.axiosClient = axios.create({ baseURL: PUBLIC_API_URL })
		} else {
			this.axiosClient = axios.create({
				baseURL: PRIVATE_API_URL,
				headers: { 'x-api-key': apiKey },
			})
		}
	}

	async quote(
		tokenIn: SolanaCurrency,
		tokenOut: SolanaCurrency,
		amount: bigint,
	) {
		const quote = await this.fetchQuote(tokenIn, tokenOut, amount, false)

		return {
			amountOut: quote.outAmount,
			unitConsumption: AVERAGE_UNITS_CONSUMPTION,
			rawQuote: quote,
		}
	}

	async swap(
		tokenIn: SolanaCurrency,
		tokenOut: SolanaCurrency,
		amount: bigint,
	): Promise<{
		txId: string
		waitForResult: () => Promise<
			| {
					status: 'success'
					amountOut: bigint
					parsedTx: ParsedTransactionWithMeta
			  }
			| {
					status: 'failed'
					parsedTx: ParsedTransactionWithMeta
			  }
		>
	}> {
		const quote = await this.fetchQuote(tokenIn, tokenOut, amount, true)

		const txId = await this.solanaClientService.sendTx(quote.transaction)

		return {
			txId,
			waitForResult: this.waitForResult.bind(this, txId, tokenOut),
		}
	}

	private async waitForResult(
		txId: string,
		tokenOut: SolanaCurrency,
	): Promise<
		| {
				status: 'success'
				amountOut: bigint
				parsedTx: ParsedTransactionWithMeta
		  }
		| {
				status: 'failed'
				parsedTx: ParsedTransactionWithMeta
		  }
	> {
		const parsedTx =
			await this.solanaClientService.waitForParsedTransaction(txId)

		if (parsedTx.meta?.err) {
			return {
				status: 'failed',
				parsedTx,
			}
		}
		const amountOut = await this.solanaClientService.parseBalanceChange(
			parsedTx,
			tokenOut,
		)

		return {
			status: 'success',
			amountOut,
			parsedTx,
		}
	}

	async fetchQuote<T extends boolean>(
		tokenIn: SolanaCurrency,
		tokenOut: SolanaCurrency,
		amount: bigint,
		shouldGetTx: T,
	): Promise<T extends true ? UltraQuoteWithTx : UltraQuote> {
		const response = await this.axiosClient.get('/ultra/v1/order', {
			params: {
				inputMint: tokenIn.address,
				outputMint: tokenOut.address,
				amount: amount,
				taker: shouldGetTx
					? this.solanaClientService.walletAddress
					: undefined,
			},
		})
		const parsed = shouldGetTx
			? UltraQuoteWithTxSchema.parse(response.data)
			: UltraQuoteSchema.parse(response.data)

		return parsed as T extends true ? UltraQuoteWithTx : UltraQuote
	}
}
