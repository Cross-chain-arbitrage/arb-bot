import { Injectable } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import { fromHex, Hash } from 'viem'
import { ChainClientService } from '../evm/chain-client/chain-client.service'
import { TokenBase } from '../evm/primitives/tokens/TokenBase'
import { QuoteSchema } from './schemas/quote.schema'
import { SwapResult } from './types'

const API_URL = 'https://li.quest'
const BASIS_POINTS: bigint = 10000n
const DEFAULT_SLIPPAGE: bigint = 50n

@Injectable()
export class LifiService {
	axiosClient: AxiosInstance

	constructor(private readonly chainClientService: ChainClientService) {
		this.axiosClient = axios.create({ baseURL: API_URL })
	}

	async quote(
		tokenIn: TokenBase,
		tokenOut: TokenBase,
		amountIn: bigint,
		slippage = DEFAULT_SLIPPAGE,
	) {
		const walletAddress = this.chainClientService.getWalletClient(
			tokenIn.chainId,
		).account.address

		const response = await this.axiosClient.get('/v1/quote', {
			params: {
				fromChain: tokenIn.chainId,
				toChain: tokenOut.chainId,
				fromToken: tokenIn.address,
				toToken: tokenOut.address,
				fromAddress: walletAddress,
				fromAmount: amountIn,
				slippage: Number(slippage) / Number(BASIS_POINTS),
			},
		})
		const quote = QuoteSchema.parse(response.data)

		return {
			rawQuote: quote,
			amountOut: quote.estimate.toAmount,
			txCostInUsd: quote.estimate.gasCosts[0].amountUSD,
		}
	}

	async swap(
		tokenIn: TokenBase,
		tokenOut: TokenBase,
		amountIn: bigint,
		slippage = DEFAULT_SLIPPAGE,
	) {
		const { rawQuote } = await this.quote(
			tokenIn,
			tokenOut,
			amountIn,
			slippage,
		)

		const balanceTokenOutBefore = await tokenOut.balanceOf(
			this.chainClientService.getWalletClient(tokenOut.chainId).account
				.address,
		)

		const walletClient = this.chainClientService.getWalletClient(
			tokenIn.chainId,
		)
		const publicClient = this.chainClientService.getClient(tokenIn.chainId)
		const txParams = {
			data: rawQuote.transactionRequest.data as Hex,
			value: fromHex(rawQuote.transactionRequest.value as Hex, 'bigint'),
			gas: fromHex(rawQuote.transactionRequest.gasLimit as Hex, 'bigint'),
			to: rawQuote.transactionRequest.to as Address,
		}

		await publicClient.call({
			...txParams,
			account: rawQuote.transactionRequest.from as Address,
		})

		const txHash = await walletClient.sendTransaction(txParams)

		return {
			txHash: txHash,
			waitForResult: async () =>
				this.waitForResult(
					txHash,
					tokenIn,
					tokenOut,
					balanceTokenOutBefore,
				),
		}
	}

	async waitForResult(
		txHash: Hash,
		tokenIn: TokenBase,
		tokenOut: TokenBase,
		balanceTokenOutBefore: bigint,
	): Promise<SwapResult> {
		const receipt = await this.chainClientService
			.getClient(tokenIn.chainId)
			.waitForTransactionReceipt({
				hash: txHash,
			})

		const status = receipt.status === 'success' ? 'success' : 'reverted'

		if (status === 'reverted') {
			return {
				status,
				receipt,
			}
		}

		const balanceTokenOutAfter = await tokenOut.balanceOf(
			this.chainClientService.getWalletClient(tokenOut.chainId).account
				.address,
		)

		const amountOut = balanceTokenOutAfter - balanceTokenOutBefore

		return { status, receipt, amountOut }
	}
}
