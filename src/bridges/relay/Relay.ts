import {
	createClient,
	Execute,
	MAINNET_RELAY_API,
	RelayClient,
} from '@reservoir0x/relay-sdk'
import { Hash, TransactionReceipt } from 'viem'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { ClientManager } from '../../utils/ClientManager'
import { createCustomError } from '../../utils/common'

//TODO: add validation and write tests
export class Relay {
	static customError = createCustomError('RelayError')
	static client: RelayClient = createClient({
		baseApiUrl: MAINNET_RELAY_API,
	})

	static async quote(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amountIn: bigint,
		slippage: bigint = 10n,
	): Promise<{
		amountOut: bigint
		gas: bigint
		rawResult: Execute
	}> {
		const walletClient = ClientManager.getWalletClient(tokenIn.chainId)

		const quote = await this.client.actions.getQuote({
			chainId: tokenIn.chainId,
			currency: tokenIn.address,
			toChainId: tokenOut.chainId,
			toCurrency: tokenOut.address,
			amount: amountIn.toString(),
			tradeType: 'EXACT_INPUT',
			options: {
				slippageTolerance: slippage.toString(),
			},
			user: walletClient.account.address,
			recipient: walletClient.account.address,
		})

		const amountOut = this.ensureVariable(
			quote.details?.currencyOut?.amount,
			'Amount out not found',
			quote,
		)

		const gas = this.ensureVariable(
			quote.fees?.gas?.amount,
			'Gas not found',
			quote,
		)

		return {
			amountOut: BigInt(amountOut),
			gas: BigInt(gas),
			rawResult: quote,
		}
	}

	static async bridge(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amountIn: bigint,
		slippage: bigint = 10n,
	): Promise<{
		amountOut: bigint
		srcTxReceipt: TransactionReceipt
		dstTxHash: Hash
		rawResult: { data: Execute; abortController: AbortController }
	}> {
		const quote = await this.quote(tokenIn, tokenOut, amountIn, slippage)

		const executionResult = await this.client.actions.execute({
			quote: quote.rawResult,
			wallet: ClientManager.getWalletClient(tokenIn.chainId),
		})

		const progressState = this.ensureVariable(
			executionResult.data.steps[0].items[0].progressState,
			'Progress state not found',
			executionResult,
		)

		if (progressState !== 'complete') {
			throw new this.customError('Bridge failed')
		}

		const amountOut = this.ensureVariable(
			executionResult.data.details?.currencyOut?.amount,
			'Amount out not found',
			executionResult,
		)

		const srcTxReceipt = this.ensureVariable(
			executionResult.data.steps[0].items[0].receipt,
			'Source transaction receipt not found',
			executionResult,
		)

		const dstTxHash = this.ensureVariable(
			executionResult.data.steps[0].items[0].txHashes?.[0].txHash,
			'Destination transaction hash not found',
			executionResult,
		) as Hash

		return {
			amountOut: BigInt(amountOut),
			srcTxReceipt: srcTxReceipt as TransactionReceipt,
			dstTxHash,
			rawResult: executionResult,
		}
	}

	private static ensureVariable<T>(
		variable: T | undefined,
		errorMessage: string,
		trace: object,
	) {
		if (!variable) {
			const error = new this.customError(errorMessage)

			error.stack += `\nTrace: ${JSON.stringify(trace)}`

			throw error
		}

		return variable
	}
}
