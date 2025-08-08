import { Injectable } from '@nestjs/common'
import {
	convertViemChainToRelayChain,
	createClient,
	Execute,
	MAINNET_RELAY_API,
	RelayChain,
	SvmReceipt,
} from '@reservoir0x/relay-sdk'
import { adaptSolanaWallet } from '@reservoir0x/relay-solana-wallet-adapter'
import {
	sendAndConfirmTransaction,
	SendOptions,
	Transaction,
	TransactionSignature,
	VersionedTransaction,
} from '@solana/web3.js'
import { TransactionReceipt } from 'viem'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { SolanaClientService } from '../../solana/solana-client.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { createCustomError } from '../../utils/common'

@Injectable()
export class RelayService {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly solanaClientService: SolanaClientService,
	) {}

	customError = createCustomError('RelayError')

	private createClient(tokens: (Token | NativeCurrency | SolanaToken)[]) {
		const chains = tokens.map((token) => {
			if (token instanceof SolanaToken) {
				const chain: RelayChain = {
					displayName: 'Solana',
					id: token.chainId,
					name: 'solana',
				}

				return chain
			}

			return convertViemChainToRelayChain(
				this.chainClientService.getChain(token.chainId),
			)
		})

		return createClient({
			baseApiUrl: MAINNET_RELAY_API,
			chains,
		})
	}

	async quote(
		tokenIn: Token | NativeCurrency | SolanaToken,
		tokenOut: Token | NativeCurrency | SolanaToken,
		amountIn: bigint,
		slippage: bigint = 10n,
	): Promise<{
		amountOut: bigint
		gasInNative: bigint
		rawResult: Execute
	}> {
		const srcAddress = this.resolveWalletAddress(tokenIn)
		const dstAddress = this.resolveWalletAddress(tokenOut)

		const quoteArgs = {
			chainId: tokenIn.chainId,
			currency: tokenIn.address,
			toChainId: tokenOut.chainId,
			toCurrency: tokenOut.address,
			amount: amountIn.toString(),
			tradeType: 'EXACT_INPUT',
			options: {
				slippageTolerance: slippage.toString(),
			},
			user: srcAddress,
			recipient: dstAddress,
		} as const

		const quote = await this.createClient([
			tokenIn,
			tokenOut,
		]).actions.getQuote(quoteArgs)

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
			gasInNative: BigInt(gas),
			rawResult: quote,
		}
	}

	resolveWalletAddress(token: Token | NativeCurrency | SolanaToken) {
		if (token instanceof SolanaToken)
			return this.solanaClientService.walletAddress

		return this.chainClientService.getWalletClient(token.chainId).account
			.address
	}

	async bridge(
		tokenIn: Token | NativeCurrency | SolanaToken,
		tokenOut: Token | NativeCurrency | SolanaToken,
		amountIn: bigint,
		slippage: bigint = 10n,
	): Promise<{
		amountOut: bigint
		srcTxHash: string
		dstTxHash: string
		rawResult: { data: Execute; abortController: AbortController }
	}> {
		const quote = await this.quote(tokenIn, tokenOut, amountIn, slippage)

		let executionResult: {
			data: Execute
			abortController: AbortController
		}

		const client = this.createClient([tokenIn, tokenOut])

		if (tokenIn instanceof SolanaToken) {
			const adaptedWallet = adaptSolanaWallet(
				this.solanaClientService.walletAddress,
				tokenIn.chainId,
				this.solanaClientService.connection,
				this.signAndSendTransaction.bind(this),
			)

			executionResult = await client.actions.execute({
				quote: quote.rawResult,
				wallet: adaptedWallet,
			})
		} else {
			executionResult = await client.actions.execute({
				quote: quote.rawResult,
				wallet: this.chainClientService.getWalletClient(
					tokenIn.chainId,
				),
			})
		}

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

		let srcTxHash: string

		if (tokenIn instanceof SolanaToken) {
			srcTxHash = (srcTxReceipt as SvmReceipt).txHash
		} else {
			srcTxHash = (srcTxReceipt as TransactionReceipt).transactionHash
		}

		const dstTxHash = this.ensureVariable(
			executionResult.data.steps[0].items[0].txHashes?.[0].txHash,
			'Destination transaction hash not found',
			executionResult,
		)

		return {
			amountOut: BigInt(amountOut),
			srcTxHash,
			dstTxHash,
			rawResult: executionResult,
		}
	}
	private async signAndSendTransaction(
		transaction: Transaction | VersionedTransaction,
		options?: SendOptions,
	): Promise<{
		signature: TransactionSignature
	}> {
		if (transaction instanceof VersionedTransaction) {
			transaction.sign([this.solanaClientService.keypair])
			const tx = await this.solanaClientService.sendAndConfirmTx(
				transaction,
				options,
			)

			return { signature: tx }
		} else {
			transaction.sign(this.solanaClientService.keypair)

			const txId = await sendAndConfirmTransaction(
				this.solanaClientService.connection,
				transaction,
				[this.solanaClientService.keypair],
				options,
			)

			return { signature: txId }
		}
	}

	private ensureVariable<T>(
		variable: T | undefined,
		errorMessage: string,
		trace: object,
	): T {
		if (!variable) {
			const error = new this.customError(errorMessage)

			error.stack += `\nTrace: ${JSON.stringify(trace)}`

			throw error
		}

		return variable
	}
}

// @Module({
// 	imports: [ChainClientModule.forRoot()],
// 	providers: [
// 		RelayService,
// 		SolanaClientService,
// 		TokenUtils,
// 		SolanaTokenUtils,
// 	],
// })
// class AppModule {}

// async function main() {
// 	const app = await NestFactory.create(AppModule)
// 	await app.init()

// 	const relayService = app.get(RelayService)
// 	const tokenUtils = app.get(TokenUtils)
// 	const solanaTokenUtils = app.get(SolanaTokenUtils)

// 	const usdcOnArbitrum = await tokenUtils.fromAddress(
// 		'0xaf88d065e77c8cc2239327c5edb3a432268e5831',
// 		arbitrum.id,
// 	)

// 	const usdcOnSolana = await solanaTokenUtils.fromAddress<SolanaToken>(
// 		'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
// 	)

// 	const bridgeResult = await relayService.bridge(
// 		usdcOnArbitrum,
// 		usdcOnSolana,
// 		usdcOnArbitrum.parseUnits('1'),
// 	)

// 	console.log(bridgeResult)
// }

// void main()
