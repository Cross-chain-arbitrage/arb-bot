import { Injectable } from '@nestjs/common'
import axios from 'axios'
import { ChainClientService } from '../../../chain-client/chain-client.service'
import { NativeCurrency } from '../../../primitives/tokens/NativeCurrency'
import { Token } from '../../../primitives/tokens/Token'
import { TokenAmount } from '../../../primitives/tokens/TokenAmount'
import { TokenUtils } from '../../../primitives/tokens/TokenUtils'
import { createCustomError } from '../../../utils/common'
import { LayerZeroScanService } from '../layerzero-scan/layerzero-scan.service'
import { STARGATE_CHAINS } from './dumped/chains'
import { StargateBridgeTx } from './stargate-tx'

export interface QuoteResponse {
	quotes: Quote[]
}

export interface Quote {
	route: string
	error: null
	srcAmount: string
	dstAmount: string
	srcAmountMax: string
	dstAmountMin: string
	srcToken: string
	dstToken: string
	srcAddress: string
	dstAddress: string
	srcChainKey: string
	dstChainKey: string
	dstNativeAmount: string
	duration: Duration
	fees: Fee[]
	steps: Step[]
}

export interface Duration {
	estimated: number
}

export interface Fee {
	token: string
	chainKey: string
	amount: string
	type: string
}

export interface Step {
	type: string
	sender: string
	chainKey: string
	transaction: Transaction
}

export interface Transaction {
	data: string
	to: string
	value: string
	from: string
}

const BRIDGE_GAS_COST = 400_000n

@Injectable()
export class SimpleStargateService {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly tokenUtils: TokenUtils,
		private readonly layerZeroScanService: LayerZeroScanService,
	) {}

	baseUrl = 'https://stargate.finance/api/v1'
	customError = createCustomError('SimpleStargateError')

	async quote(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amountIn: bigint,
	): Promise<{
		amountOut: bigint
		lzFee: TokenAmount
		gas: bigint
		rawQuoteResult: Quote
	}> {
		const walletClient = this.chainClientService.getWalletClient(
			tokenIn.chainId,
		)

		const response = await axios.get<QuoteResponse>('/quotes', {
			baseURL: this.baseUrl,
			params: {
				srcToken: tokenIn.address,
				dstToken: tokenOut.address,
				srcAddress: walletClient.account.address,
				dstAddress: walletClient.account.address,
				srcChainKey: this.chainIdToChainKey(tokenIn.chainId),
				dstChainKey: this.chainIdToChainKey(tokenOut.chainId),
				srcAmount: amountIn,
				dstAmountMin: (amountIn * 999n) / 1000n, //for oft slippage is 0, TODO: handle for all cases
			},
		})

		const quote = response.data.quotes[0]

		if (quote.route === null) {
			const error = new this.customError('No route found')
			error.stack += `\n${JSON.stringify(response.data)}`
			throw error
		}

		const nativeCurrency = this.tokenUtils.getNative(tokenIn.chainId)

		return {
			amountOut: BigInt(quote.srcAmount), //TODO: consider fee
			lzFee: new TokenAmount(
				this.chainClientService,
				nativeCurrency,
				BigInt(quote.fees[0].amount),
			),
			gas: BRIDGE_GAS_COST,
			rawQuoteResult: quote,
		}
	}

	async bridge(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amountIn: bigint,
	): Promise<{
		amountOut: bigint
		lzFee: TokenAmount
		bridgeTx: StargateBridgeTx
	}> {
		const { amountOut, lzFee, rawQuoteResult } = await this.quote(
			tokenIn,
			tokenOut,
			amountIn,
		)

		const walletClient = this.chainClientService.getWalletClient(
			tokenIn.chainId,
		)

		const tx = await walletClient.sendTransaction({
			to: rawQuoteResult.steps[0].transaction.to as `0x${string}`,
			data: rawQuoteResult.steps[0].transaction.data as `0x${string}`,
			value: BigInt(rawQuoteResult.steps[0].transaction.value),
		})

		return {
			amountOut,
			lzFee,
			bridgeTx: new StargateBridgeTx(
				this.layerZeroScanService,
				tx,
				tokenIn,
				tokenOut,
				amountIn,
			),
		}
	}

	chainIdToChainKey(chainId: number) {
		const chain = STARGATE_CHAINS.find((chain) => chain.chainId === chainId)

		if (!chain) {
			throw new Error(`Chain ${chainId} not found`)
		}

		return chain.chainKey
	}
}
