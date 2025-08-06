import { Cache } from '@nestjs/cache-manager'
import z from 'zod'
import { RelayService } from '../../../../bridges/relay/relay-service'
import { ChainClientService } from '../../../../chain-client/chain-client.service'
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
	getRelayRateFunction(
		amountIn: bigint,
		relayQuote: z.infer<typeof relayQuoteSchema>,
		gas: bigint,
	) {
		const k =
			1 -
			(Number(relayQuote.fees.relayer.amount) +
				Number(relayQuote.fees.relayerService.amount)) /
				Number(amountIn)

		const b = -Number(relayQuote.fees.relayerGas.amount)

		return (amountIn: bigint) => {
			const amountOut = k * Number(amountIn) + b
			return {
				rate: this.calcRate(amountIn, BigInt(amountOut)),
				amountOut: BigInt(amountOut),
				gas: gas,
			}
		}
	}

	readonly id: EdgeId

	private pendingQuoteRequest: Promise<void> | null = null

	constructor(
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		chainClientService: ChainClientService,
		readonly relay: RelayService,
		cacheService: Cache,
		readonly rateFunctionTTL: number = 5000,
	) {
		super(from, to, cacheService)
		this.id = `${this.from.id}-${this.to.id}-${RelayBridgeEdge.name}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const cachedRateFunction = await this.cacheService.get<
			(amountIn: bigint) => {
				rate: number
				amountOut: bigint
				gas: bigint
			}
		>(`${this.id}-rateFunction`)

		let rate: number
		let amountOut: bigint
		let gas: bigint

		if (cachedRateFunction) {
			;({ rate, amountOut, gas } = cachedRateFunction(amountIn))
		} else {
			// If there's already a pending request, wait for it to complete
			if (this.pendingQuoteRequest) {
				await this.pendingQuoteRequest

				// After waiting, check cache again
				const cachedRateFunctionAfterWait = await this.cacheService.get<
					(amountIn: bigint) => {
						rate: number
						amountOut: bigint
						gas: bigint
					}
				>(`${this.id}-rateFunction`)
				if (cachedRateFunctionAfterWait) {
					;({ rate, amountOut, gas } =
						cachedRateFunctionAfterWait(amountIn))
				} else {
					throw new Error(
						'Rate function should be cached after pending request completion',
					)
				}
			} else {
				// Make the request and cache it for other concurrent calls
				this.pendingQuoteRequest =
					this.fetchAndCacheRateFunction(amountIn)

				try {
					await this.pendingQuoteRequest

					// Get the cached rate function that was just set
					const newCachedRateFunction = await this.cacheService.get<
						(amountIn: bigint) => {
							rate: number
							amountOut: bigint
							gas: bigint
						}
					>(`${this.id}-rateFunction`)

					if (!newCachedRateFunction) {
						throw new Error(
							'Rate function should be cached after fetch',
						)
					}

					;({ rate, amountOut, gas } =
						newCachedRateFunction(amountIn))
				} finally {
					// Clear the pending request
					this.pendingQuoteRequest = null
				}
			}
		}

		return {
			rate: rate,
			amountOut: amountOut,
			costInUsd: 0, //TODO: add cost in usd (Relay returns already calculated gas * gasPrice in quote)
		}
	}

	private async fetchAndCacheRateFunction(amountIn: bigint): Promise<void> {
		const quote = await this.relay.quote(this.from, this.to, amountIn)
		const relayQuote = relayQuoteSchema.parse(quote.rawResult)

		await this.cacheService.set(
			`${this.id}-rateFunction`,
			this.getRelayRateFunction(amountIn, relayQuote, quote.gasInNative),
		)
	}

	async execute(amountIn: bigint): Promise<CrosschainEdgeExecutionResult> {
		const result = await this.relay.bridge(this.from, this.to, amountIn)

		return {
			amountOut: result.amountOut,
			srcTxHash: result.srcTxReceipt.transactionHash,
			dstTxHash: result.dstTxHash,
			costInUsd: 0,
		}
	}

	async approve(): Promise<(string | undefined)[]> {
		return Promise.resolve([])
	}
}
