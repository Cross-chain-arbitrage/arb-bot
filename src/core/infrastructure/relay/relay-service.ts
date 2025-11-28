import { Injectable } from '@nestjs/common'
import {
	PublicKey,
	TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
} from '@solana/web3.js'
import { Hash } from 'viem'
import { createCustomError } from '../../../utils/common'
import { poll } from '../../../utils/polling'
import { ChainClientService } from '../evm/chain-client/chain-client.service'
import { EvmHelper } from '../evm/evm-helper'
import { NativeCurrency } from '../evm/primitives/tokens/NativeCurrency'
import { Token } from '../evm/primitives/tokens/Token'
import { SolanaClientService } from '../solana/solana-client.service'
import { SolanaToken } from '../solana/solana-tokens/solana-token'
import { SOLANA_RELAY_CHAIN_ID } from './constants'
import { RelayApiService } from './relay-api.service'
import { ExecutionFullStatus } from './schemas/relay-execution-status.schema'
import { QuoteEvmSrc } from './schemas/relay-quite-evm-src.schema'
import { QuoteSolanaSrc } from './schemas/relay-quite-solana-src.schema'
import { DstBridgeResult, Quote, SrcBridgeResult } from './types'

const MAX_EXECUTION_TIME = 60_000

@Injectable()
export class RelayService {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly solanaClientService: SolanaClientService,
		private readonly relayApiService: RelayApiService,
		private readonly evmHelper: EvmHelper,
	) {}

	customError = createCustomError('RelayError')

	async quote(
		tokenIn: Token | NativeCurrency | SolanaToken,
		tokenOut: Token | NativeCurrency | SolanaToken,
		amountIn: bigint,
		slippage: bigint = 10n,
	): Promise<Quote> {
		const srcAddress = this.resolveWalletAddress(tokenIn)
		const dstAddress = this.resolveWalletAddress(tokenOut)

		const quote = await this.relayApiService.getQuote({
			user: srcAddress,
			recipient: dstAddress,
			originChainId:
				tokenIn instanceof SolanaToken
					? SOLANA_RELAY_CHAIN_ID
					: Number(tokenIn.chainId),
			destinationChainId:
				tokenOut instanceof SolanaToken
					? SOLANA_RELAY_CHAIN_ID
					: Number(tokenOut.chainId),
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
	): Promise<SrcBridgeResult> {
		const quote = await this.quote(tokenIn, tokenOut, amountIn, slippage)

		let srcTxHash: string

		if (tokenIn instanceof SolanaToken) {
			srcTxHash = await this.bridgeFromSolana(
				quote as Quote<QuoteSolanaSrc>,
			)
		} else {
			srcTxHash = await this.bridgeFromEvm(
				quote as Quote<QuoteEvmSrc>,
				tokenIn,
			)
		}

		return {
			srcTxHash,
			waitForBridge: async () => {
				const res = await this.waitExecution(
					quote.rawResult.steps[0].requestId,
					tokenOut,
				)

				return res
			},
		}
	}

	private async bridgeFromSolana(quote: Quote<QuoteSolanaSrc>) {
		const txArgs = quote.rawResult.steps[0].items[0].data

		const instructions: TransactionInstruction[] = txArgs.instructions.map(
			(instruction) => {
				return new TransactionInstruction({
					programId: new PublicKey(instruction.programId),
					keys: instruction.keys.map((key) => ({
						pubkey: new PublicKey(key.pubkey),
						isSigner: key.isSigner,
						isWritable: key.isWritable,
					})),
					data: Buffer.from(instruction.data, 'hex'),
				})
			},
		)

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

		const srcTxHash = await this.solanaClientService.sendTx(transaction)

		return srcTxHash
	}

	private async bridgeFromEvm(
		quote: Quote<QuoteEvmSrc>,
		tokenIn: Token | NativeCurrency,
	) {
		const txArgs = quote.rawResult.steps[0].items[0].data

		const srcTxHash = await this.chainClientService
			.getWalletClient(tokenIn.chainId)
			.sendTransaction({
				to: txArgs.to as Address,
				value: BigInt(txArgs.value),
				data: txArgs.data as Hash,
			})

		return srcTxHash
	}

	private async waitExecution(
		requestId: string,
		tokenOut: Token | NativeCurrency | SolanaToken,
	): Promise<DstBridgeResult> {
		const res = (await poll(
			() => this.relayApiService.getExecutionStatus(requestId),
			(status) => status.status === 'success',
			500,
			MAX_EXECUTION_TIME,
		)) as ExecutionFullStatus

		const dstTxHash = res.txHashes[0]

		let amountOut

		if (tokenOut instanceof SolanaToken) {
			const parsedTx =
				await this.solanaClientService.waitForParsedTransaction(
					dstTxHash,
				)

			amountOut = await this.solanaClientService.parseBalanceChange(
				parsedTx,
				tokenOut,
			)
		} else {
			const txReceipt = await this.evmHelper.waitForTransactionReceipt(
				tokenOut.chainId,
				dstTxHash as Hash,
			)

			amountOut = await this.evmHelper.parseBalanceChange(
				tokenOut,
				txReceipt,
			)
		}

		return {
			amountOut,
			dstTxHash: res.txHashes[0],
		}
	}
}
