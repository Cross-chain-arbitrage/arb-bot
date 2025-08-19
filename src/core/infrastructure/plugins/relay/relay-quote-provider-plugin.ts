import { Injectable } from '@nestjs/common'
import z from 'zod'
import { convertDecimals } from '../../../../utils/common'
import {
	EdgeQuoteProvider,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-quote-provider'
import { QuoteProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { GasPriceOracleService } from '../../evm/gas-price-oracle/gas-price-oracle.service'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { RelayService } from '../../relay/relay-service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { estimateTokenAmountFromUsd } from '../helpers/context-helpers'
import { calcRate } from '../helpers/helpers'
import { getExpectedTxCostInUsd } from '../helpers/solana-evm-context-helpers'
import { RelayGraphPlugin } from './relay-graph-plugin'

const QUOTE_USD_AMOUNT_IN = 500

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

@Injectable()
export class RelayQuoteProviderPlugin
	extends RelayGraphPlugin
	implements QuoteProviderPlugin
{
	constructor(
		private readonly relayService: RelayService,
		readonly priceOracle: PriceOracle,
		readonly solanaTokenUtils: SolanaTokenUtils,
		readonly tokenUtils: TokenUtils,
		readonly gasPriceOracleService: GasPriceOracleService,
	) {
		super()
	}

	buildEdgeQuoteProvider(
		edge: Edge<SolanaToken | Token | NativeCurrency>,
	): EdgeQuoteProvider {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(edge: Edge<SolanaToken | Token | NativeCurrency>) {
		const amountIn = await estimateTokenAmountFromUsd.bind(this)(
			edge.from,
			QUOTE_USD_AMOUNT_IN,
		)

		const quote = await this.relayService.quote(
			edge.from,
			edge.to,
			amountIn,
		)
		const relayQuote = relayQuoteSchema.parse(quote.rawResult)

		const costInUsd = await getExpectedTxCostInUsd.bind(this)(
			edge.from,
			quote.gasInNative,
		)

		return this.buildApproximatedQuoteFunction(
			edge,
			amountIn,
			relayQuote,
			costInUsd,
		)
	}
	buildApproximatedQuoteFunction(
		edge: Edge<SolanaToken | Token | NativeCurrency>,
		amountIn: bigint,
		relayQuote: z.infer<typeof relayQuoteSchema>,
		costInUsd: number,
	): EdgeSnapshotFn {
		const relayerFee = Number(relayQuote.fees.relayer.amount)
		const relayerServiceFee = Number(relayQuote.fees.relayerService.amount)
		const relayerGasFee = Number(relayQuote.fees.relayerGas.amount)

		const amountInTokenOutDecimals = Number(
			convertDecimals(amountIn, edge.from, edge.to),
		)
		const k =
			1 - (relayerFee + relayerServiceFee) / amountInTokenOutDecimals

		const b = -relayerGasFee

		return (amountIn: bigint): Quote => {
			const amountInTokenOutDecimals = Number(
				convertDecimals(amountIn, edge.from, edge.to),
			)

			const amountOut = k * amountInTokenOutDecimals + b

			return {
				rate: calcRate(amountIn, BigInt(Math.floor(amountOut))),
				amountOut: BigInt(Math.floor(amountOut)),
				executionCostInUsd: costInUsd,
			}
		}
	}
}
