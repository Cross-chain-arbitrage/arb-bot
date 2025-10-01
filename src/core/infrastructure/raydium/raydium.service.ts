import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import {
	Connection,
	ParsedTransactionWithMeta,
	SendTransactionError,
} from '@solana/web3.js'
import axios from 'axios'
import { createCustomError } from '../../../utils/common'
import { SolanaClientService } from '../solana/solana-client.service'
import { SolanaNative } from '../solana/solana-tokens/solana-native'
import { SolanaToken } from '../solana/solana-tokens/solana-token'
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
	defaultSlippage = 30

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

	async swap(params: SwapParams): Promise<{
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
		try {
			const quote = await this.quote(params)

			const rawTx = await this.getTransaction(quote.rawQuote, params)

			const txId = await this.solanaClientService.sendTx(rawTx)

			return {
				txId,
				waitForResult: this.waitForResult.bind(
					this,
					txId,
					params.tokenOut,
				),
			}
		} catch (error) {
			if (this.isRewardTimestampError(error)) {
				return this.swap(params)
			}

			throw error
		}
	}

	private async waitForResult(
		txId: string,
		tokenOut: SolanaToken | SolanaNative,
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

	/**
	 * This error occurs when the program checks a timestamp related to rewards.
	 * The function where it happens does not include a timestamp argument, so this is a bug in Raydium.
	 */
	isRewardTimestampError(error: unknown) {
		let isRewardTimestampError = false

		if (error instanceof SendTransactionError) {
			const logs = error.logs

			if (logs) {
				const errorLog = logs.find((log) =>
					log.includes(
						'AnchorError thrown in programs/amm/src/states/pool.rs:357',
					),
				)

				if (errorLog) {
					isRewardTimestampError = true
				}
			}
		}

		return isRewardTimestampError
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
