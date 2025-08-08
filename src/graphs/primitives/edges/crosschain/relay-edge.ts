import { Cache } from '@nestjs/cache-manager'
import z from 'zod'
import { RelayService } from '../../../../bridges/relay/relay-service'
import { convertDecimals } from '../../../../utils/common'
import { EdgeHelperService } from '../edge-helper.service'
import { CrosschainEdge } from './crosschain-edge'

const feeSchema = z.object({
	currency: z.object({
		chainId: z.number(),
		address: z.string(),
	}),
	amount: z.string(),
})
const relayQuoteSchema = z.object({
	fees: z.object({
		gas: feeSchema,
		relayerGas: feeSchema,
		relayerService: feeSchema,
		app: feeSchema,
		relayer: feeSchema,
	}),
})

export class RelayBridgeEdge extends CrosschainEdge {
	// amountOut = k * amountIn + b
	readonly id: EdgeId
	readonly approximatedQuoteFunctionKey = `${this.id}-approximatedQuoteFunction`

	private pendingQuoteRequest: Promise<void> | null = null

	constructor(
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		readonly edgeHelperService: EdgeHelperService,
		readonly relay: RelayService,
		cacheService: Cache,
		readonly rateFunctionTTL: number = 5000,
	) {
		super(from, to, cacheService)
		this.id = `${this.from.id}-${this.to.id}-${RelayBridgeEdge.name}`
	}

	buildApproximatedQuoteFunction(
		amountIn: bigint,
		relayQuote: z.infer<typeof relayQuoteSchema>,
		costInUsd: number,
	): (amountIn: bigint) => EdgeQuoteResult {
		const relayerFee = Number(relayQuote.fees.relayer.amount)
		const relayerServiceFee = Number(relayQuote.fees.relayerService.amount)
		const relayerGasFee = Number(relayQuote.fees.relayerGas.amount)

		const amountInTokenOutDecimals = Number(
			convertDecimals(amountIn, this.from, this.to),
		)
		const k =
			1 - (relayerFee + relayerServiceFee) / amountInTokenOutDecimals

		const b = -relayerGasFee

		return (amountIn: bigint) => {
			const amountInTokenOutDecimals = Number(
				convertDecimals(amountIn, this.from, this.to),
			)

			const amountOut = k * amountInTokenOutDecimals + b

			return {
				rate: this.calcRate(amountIn, BigInt(Math.floor(amountOut))),
				amountOut: BigInt(Math.floor(amountOut)),
				costInUsd: costInUsd,
			}
		}
	}

	getApproximatedQuoteFunction() {
		return this.cacheService.get<
			ReturnType<typeof this.buildApproximatedQuoteFunction>
		>(this.approximatedQuoteFunctionKey)
	}

	async waitForQuoteRequestAndReturnResult(amountIn: bigint) {
		if (this.pendingQuoteRequest) {
			await this.pendingQuoteRequest
		}

		const cachedApproximatedQuoteFunction =
			await this.getApproximatedQuoteFunction()

		if (!cachedApproximatedQuoteFunction) {
			throw new Error(
				'Rate function should be cached after pending request completion',
			)
		}

		return cachedApproximatedQuoteFunction(amountIn)
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const cachedRateFunction = await this.getApproximatedQuoteFunction()

		if (!cachedRateFunction && !this.pendingQuoteRequest) {
			this.pendingQuoteRequest = this.fetchAndCacheRateFunction(amountIn)

			try {
				return await this.waitForQuoteRequestAndReturnResult(amountIn)
			} finally {
				this.pendingQuoteRequest = null
			}
		}

		if (!cachedRateFunction) {
			return await this.waitForQuoteRequestAndReturnResult(amountIn)
		}

		return cachedRateFunction(amountIn)
	}

	private async fetchAndCacheRateFunction(amountIn: bigint): Promise<void> {
		const quote = await this.relay.quote(this.from, this.to, amountIn)
		const relayQuote = relayQuoteSchema.parse(quote.rawResult)

		const costInUsd = await this.edgeHelperService.getExpectedTxCost(
			this.from,
			quote.gasInNative,
		)

		await this.cacheService.set(
			this.approximatedQuoteFunctionKey,
			this.buildApproximatedQuoteFunction(
				amountIn,
				relayQuote,
				costInUsd,
			),
			this.rateFunctionTTL,
		)
	}

	async execute(amountIn: bigint): Promise<CrosschainEdgeExecutionResult> {
		const result = await this.relay.bridge(this.from, this.to, amountIn)

		const srcTxResult = await this.edgeHelperService.getTxResult(
			this.from,
			result.srcTxHash,
		)

		const costInUsd = await this.edgeHelperService.getActualGasCostInUsd(
			this.from,
			srcTxResult,
		)

		return {
			amountOut: result.amountOut,
			srcTxHash: result.srcTxHash,
			dstTxHash: result.dstTxHash,
			costInUsd,
		}
	}

	async approve(): Promise<(string | undefined)[]> {
		return Promise.resolve([])
	}
}
