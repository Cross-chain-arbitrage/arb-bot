import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import {
	Connection,
	ParsedTransactionWithMeta,
	TokenBalance,
	VersionedTransaction,
} from '@solana/web3.js'
import axios from 'axios'
import { createCustomError } from '../../utils/common'
import { SolanaClientService } from '../solana-client.service'
import { SolanaNative } from '../solana-tokens/solana-native'
import { SolanaToken } from '../solana-tokens/solana-token'
import { API_URLS } from './raydium.constants'
import {
	PriorityFee,
	PriorityFeeSchema,
} from './schemas/raydium-priority-fee.schema'
import {
	RaydiumQuote,
	RaydiumQuoteSchema,
} from './schemas/raydium-quote.schema'
import { TransactionSchema } from './schemas/raydium-transaction.schema'

interface SwapParams {
	tokenIn: SolanaToken | SolanaNative
	tokenOut: SolanaToken | SolanaNative
	amountIn: bigint
	slippage?: number
}

const AVERAGE_UNITS_CONSUMPTION = 200_000
const RaydiumServiceError = createCustomError('RaydiumServiceError')

@Injectable()
export class RaydiumService {
	apiUrl = 'https://transaction-v1.raydium.io'
	connection = new Connection('https://api.mainnet-beta.solana.com')
	priorityFeeCacheKey = 'raydium-priority-fee'
	priorityFeeCacheTtl = 1000 * 60
	txVersion = 'V0'
	defaultSlippage = 10

	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private solanaClientService: SolanaClientService,
	) {}

	async quote(params: SwapParams) {
		const response = await axios.get('/compute/swap-base-in', {
			baseURL: this.apiUrl,
			params: {
				inputMint: params.tokenIn.address,
				outputMint: params.tokenOut.address,
				amount: params.amountIn,
				slippageBps: params.slippage ?? this.defaultSlippage,
				txVersion: this.txVersion,
			},
		})

		const quote = RaydiumQuoteSchema.parse(response.data)

		return {
			amountOut: BigInt(quote.data.outputAmount),
			unitConsumption: AVERAGE_UNITS_CONSUMPTION,
			rawQuote: quote,
		}
	}

	async swap(params: SwapParams) {
		const quote = await this.quote(params)

		const rawTx = await this.getTransaction(quote.rawQuote, params)

		const txBuf = Buffer.from(rawTx, 'base64')
		const tx = VersionedTransaction.deserialize(txBuf)

		tx.sign([this.solanaClientService.keypair])

		const txHash = await this.solanaClientService.sendAndConfirmTx(tx)

		const parsedTx =
			await this.solanaClientService.connection.getParsedTransaction(
				txHash,
				{
					commitment: 'confirmed',
					maxSupportedTransactionVersion: 0,
				},
			)

		if (!parsedTx) throw new RaydiumServiceError('Transaction not found')

		const amountOut = await this.parseAmountOut(params.tokenOut, parsedTx)

		return {
			tx: parsedTx,
			amountOut,
		}
	}

	async parseAmountOut(
		tokenOut: SolanaToken | SolanaNative,
		parsedTx: ParsedTransactionWithMeta,
	): Promise<bigint> {
		const outputTokenAccount =
			tokenOut instanceof SolanaToken
				? await tokenOut.getTokenAccount(
						this.solanaClientService.walletAddress,
					)
				: this.solanaClientService.walletAddress

		const preBalances = parsedTx.meta?.preTokenBalances

		if (!preBalances) {
			throw new RaydiumServiceError('Pre token balances not found in tx')
		}

		const preBalance = this.retrieveBalance(
			outputTokenAccount,
			parsedTx,
			preBalances,
		)

		const postBalances = parsedTx.meta?.postTokenBalances

		if (!postBalances) {
			throw new RaydiumServiceError('Post token balances not found in tx')
		}

		const postBalance = this.retrieveBalance(
			outputTokenAccount,
			parsedTx,
			postBalances,
		)

		return postBalance - preBalance
	}

	private retrieveBalance(
		tokenAccount: string,
		parsedTx: ParsedTransactionWithMeta,
		txBalances: TokenBalance[],
	): bigint {
		const accountIndex = parsedTx.transaction.message.accountKeys.findIndex(
			(account) => account.pubkey.toBase58() === tokenAccount,
		)

		if (accountIndex === -1) {
			throw new RaydiumServiceError('Token account not found in tx')
		}

		const balance = txBalances.find(
			(txBalance) => txBalance.accountIndex === accountIndex,
		)

		if (!balance) {
			throw new RaydiumServiceError(
				`Balance with account index ${accountIndex} not found in tx`,
			)
		}

		return BigInt(balance.uiTokenAmount.amount)
	}

	private async getTransaction(quote: RaydiumQuote, params: SwapParams) {
		const computeUnitPrice = await this.getComputeUnitPrice()

		const { tokenAcc: inputTokenAcc, isSol: isInputSol } =
			await this.resolveTokenAccount(params.tokenIn)

		const { tokenAcc: outputTokenAcc, isSol: isOutputSol } =
			await this.resolveTokenAccount(params.tokenOut)

		const response = await axios.post(
			'/transaction/swap-base-in',
			{
				computeUnitPriceMicroLamports: String(computeUnitPrice.h),
				swapResponse: quote,
				txVersion: this.txVersion,
				wallet: this.solanaClientService.keypair.publicKey.toBase58(),
				wrapSol: isInputSol,
				unwrapSol: isOutputSol, // true means output mint receive sol, false means output mint received wsol
				inputAccount: inputTokenAcc,
				outputAccount: outputTokenAcc,
			},
			{
				baseURL: this.apiUrl,
			},
		)

		const transaction = TransactionSchema.parse(response.data)

		return transaction.data[0].transaction
	}

	async resolveTokenAccount(token: SolanaToken | SolanaNative) {
		let tokenAcc: string | undefined
		let isSol = true

		if (token instanceof SolanaToken) {
			tokenAcc = await token.getTokenAccount(
				this.solanaClientService.keypair.publicKey.toBase58(),
			)

			isSol = false
		}

		return { tokenAcc, isSol }
	}

	async getComputeUnitPrice(): Promise<{ vh: number; h: number; m: number }> {
		const cachedPriorityFee = await this.cacheManager.get<PriorityFee>(
			this.priorityFeeCacheKey,
		)
		if (cachedPriorityFee) return cachedPriorityFee.data.default

		const response = await axios.get(
			`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`,
		)

		const priorityFee = PriorityFeeSchema.parse(response.data)

		await this.cacheManager.set(
			this.priorityFeeCacheKey,
			priorityFee,
			this.priorityFeeCacheTtl,
		)

		return priorityFee.data.default
	}
}

// @Module({
// 	imports: [CacheModule.register(), PriceOracleModule],
// 	providers: [RaydiumService, SolanaClientService],
// 	exports: [RaydiumService],
// })
// export class RaydiumModule {}

// async function main() {
// 	const app = await NestFactory.create(RaydiumModule)

// 	await app.init()

// 	const raydiumService = app.get(RaydiumService)
// 	const solanaTokenUtils = new SolanaTokenUtils()
// 	const solanaClientService = app.get(SolanaClientService)
// 	const priceOracleService = app.get(PriceOracleService)

// 	const hosikoAddress = '9wK8yN6iz1ie5kEJkvZCTxyN1x5sTdNfx8yeMY8Ebonk'
// 	const usdcAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

// 	const usdcToken =
// 		await solanaTokenUtils.fromAddress<SolanaToken>(usdcAddress)
// 	const hosikoToken =
// 		await solanaTokenUtils.fromAddress<SolanaToken>(hosikoAddress)
// 	const native = solanaTokenUtils.getNative()

// 	const swapParams = {
// 		tokenIn: usdcToken,
// 		tokenOut: hosikoToken,
// 		amountIn: usdcToken.parseUnits('1'),
// 	}

// 	const parsedTx = await solanaClientService.connection.getParsedTransaction(
// 		'WvomfZJMDcKu8bT3LY4WfvkX7GUsh4fa1HaYyiVwpTuyeGCjv8eMEFrsVqHXHjucwP31uAxoCh7E1mg3j71DYaJ',
// 		{
// 			commitment: 'confirmed',
// 			maxSupportedTransactionVersion: 0,
// 		},
// 	)

// 	const amountOut = await raydiumService.parseAmountOut(
// 		swapParams.tokenOut,
// 		parsedTx!,
// 	)

// 	console.log(amountOut, swapParams.tokenOut.formatUnits(amountOut))
// }

// function calculatePrice(
// 	computeUnitPrice: number,
// 	unitsConsumed: number,
// 	nativePrice: number,
// ) {
// 	console.log('for units', (computeUnitPrice * unitsConsumed) / 10 ** 15)
// 	console.log('for sign', 5000 / 10 ** 15)

// 	const priceInSol =
// 		((computeUnitPrice * unitsConsumed) / 10 ** 6 + 5000) / 10 ** 9

// 	console.log(priceInSol, nativePrice)

// 	return priceInSol * nativePrice
// }

// void main()
