import { Injectable } from '@nestjs/common'
import {
	PublicKey,
	TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
} from '@solana/web3.js'
import { Hash } from 'viem'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { SolanaClientService } from '../../solana/solana-client.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { createCustomError } from '../../utils/common'
import { poll } from '../../utils/polling'
import { RelayApiService } from './relay-api.service'
import { ExecutionFullStatus } from './schemas/relay-execution-status.scheme'
import {
	Data as EvmTxArgs,
	QuoteEvmSrc,
} from './schemas/relay-quite-evm-src.schema'
import {
	QuoteSolanaSrc,
	Data as SolanaTxArgs,
} from './schemas/relay-quite-solana-src.schema'

const MAX_EXECUTION_TIME = 60_000

@Injectable()
export class RelayService {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly solanaClientService: SolanaClientService,
		private readonly relayApiService: RelayApiService,
	) {}

	customError = createCustomError('RelayError')

	async quote(
		tokenIn: Token | NativeCurrency | SolanaToken,
		tokenOut: Token | NativeCurrency | SolanaToken,
		amountIn: bigint,
		slippage: bigint = 10n,
	): Promise<{
		amountOut: bigint
		gasInNative: bigint
		rawResult: QuoteEvmSrc | QuoteSolanaSrc
	}> {
		const srcAddress = this.resolveWalletAddress(tokenIn)
		const dstAddress = this.resolveWalletAddress(tokenOut)

		const quote = await this.relayApiService.getQuote({
			user: srcAddress,
			recipient: dstAddress,
			originChainId: tokenIn.chainId,
			destinationChainId: tokenOut.chainId,
			amount: Number(amountIn),
			originCurrency: tokenIn.address,
			destinationCurrency: tokenOut.address,
			slippage: Number(slippage),
		})

		return {
			amountOut: BigInt(quote.details.currencyOut.amount),
			gasInNative: BigInt(quote.fees.gas.amount),
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
		waitForTx: () => Promise<{ dstTxHash: string }>
	}> {
		const quote = await this.quote(tokenIn, tokenOut, amountIn, slippage)

		let srcTxHash: string

		if (tokenIn instanceof SolanaToken) {
			const txArgs = quote.rawResult.steps[0].items[0]
				.data as SolanaTxArgs

			const instructions: TransactionInstruction[] =
				txArgs.instructions.map((instruction) => {
					return new TransactionInstruction({
						programId: new PublicKey(instruction.programId),
						keys: instruction.keys.map((key) => ({
							pubkey: new PublicKey(key.pubkey),
							isSigner: key.isSigner,
							isWritable: key.isWritable,
						})),
						data: Buffer.from(instruction.data, 'hex'),
					})
				})

			const latestBlockhash =
				await this.solanaClientService.connection.getLatestBlockhash()

			const messageV0 = new TransactionMessage({
				instructions: instructions,
				payerKey: this.solanaClientService.keypair.publicKey,
				recentBlockhash: latestBlockhash.blockhash,
			})

			const transaction = new VersionedTransaction(
				messageV0.compileToV0Message(),
			)

			transaction.sign([this.solanaClientService.keypair])

			srcTxHash =
				await this.solanaClientService.sendAndConfirmTx(transaction)
		} else {
			const txArgs = quote.rawResult.steps[0].items[0].data as EvmTxArgs

			srcTxHash = await this.chainClientService
				.getWalletClient(tokenIn.chainId)
				.sendTransaction({
					to: txArgs.to as Address,
					value: BigInt(txArgs.value),
					data: txArgs.data as Hash,
				})
		}

		return {
			amountOut: BigInt(quote.rawResult.details.currencyOut.amount),
			srcTxHash,
			waitForTx: () =>
				this.waitExecution(quote.rawResult.steps[0].requestId),
		}
	}

	private async waitExecution(requestId: string) {
		const res = (await poll(
			() => this.relayApiService.getExecutionStatus(requestId),
			(status) => status.status === 'success',
			1000,
			MAX_EXECUTION_TIME,
		)) as ExecutionFullStatus

		return {
			dstTxHash: res.txHashes[0],
		}
	}
}

// @Module({
// 	imports: [ChainClientModule.forRoot()],
// 	providers: [
// 		RelayService,
// 		SolanaClientService,
// 		TokenUtils,
// 		SolanaTokenUtils,
// 		RelayApiService,
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

// 	const dstTx = await bridgeResult.waitForTx()

// 	console.log(dstTx)
// }

// void main()
