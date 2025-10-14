import { Injectable, Logger } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import { fromHex, Hash } from 'viem'
import { wait } from '../../../utils/common'
import { ChainClientService } from '../evm/chain-client/chain-client.service'
import { TokenBase } from '../evm/primitives/tokens/TokenBase'
import { QuoteSchema } from './schemas/quote.schema'
import { SwapResult } from './types'

const API_URL = 'https://li.quest'
const BASIS_POINTS: bigint = 10000n
const DEFAULT_SLIPPAGE: bigint = 50n

@Injectable()
export class LifiService {
	logger = new Logger(LifiService.name)
	axiosClient: AxiosInstance

	constructor(private readonly chainClientService: ChainClientService) {
		const apiKey = process.env.LIFI_API_KEY

		if (apiKey === undefined) {
			this.axiosClient = axios.create({
				baseURL: API_URL,
			})
		} else {
			this.axiosClient = axios.create({
				baseURL: API_URL,
				headers: { 'x-lifi-api-key': apiKey },
			})
		}
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
				denyExchanges: ['odos', '1inch'], // these services returns tx that can't be executed
			},
		})
		const quote = QuoteSchema.parse(response.data)
		this.logger.debug({ tool: quote.estimate.tool }, 'lifi tool')

		return {
			rawQuote: quote,
			amountOut: BigInt(quote.estimate.toAmount),
			txCostInUsd: Number(quote.estimate.gasCosts[0].amountUSD),
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
		this.logger.debug({ tool: rawQuote.estimate.tool }, 'lifi tool')

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
		if (amountOut === 0n) {
			this.logger.debug(
				{
					balanceTokenOutBefore,
					balanceTokenOutAfter,
					txHash,
				},
				'amountOut is zero, waiting 5 seconds',
			)

			await wait(5000)

			const balanceTokenOutAfterWaiting = await tokenOut.balanceOf(
				this.chainClientService.getWalletClient(tokenOut.chainId)
					.account.address,
			)

			this.logger.debug(
				{
					balanceTokenOutAfter,
					balanceTokenOutAfterWaiting,
					balanceTokenOutBefore,
				},
				'amounts after waiting',
			)
			return {
				status,
				receipt,
				amountOut: balanceTokenOutAfterWaiting - balanceTokenOutBefore,
			}
		}

		return { status, receipt, amountOut }
	}
}
