import { Injectable } from '@nestjs/common'
import z from 'zod'
import { convertDecimals } from '../../../../utils/common'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { RelayService } from '../../relay/relay-service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmPluginHelper } from '../shared-utils/chain-specific/solana-evm/solana-evm-tx-cost.utils'
import { PriceOracleHelper } from '../shared-utils/price-oracle-helper'
import { RelayPlugin } from './relay-plugin'

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
export class RelaySnapshotPlugin extends RelayPlugin implements SnapshotPlugin {
	constructor(
		private readonly relayService: RelayService,
		readonly solanaEvmPluginHelper: SolanaEvmPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
	}

	buildEdgeSnapshotBuilder(
		edge: Edge<SolanaToken | Token | NativeCurrency>,
	): EdgeSnapshotBuilder {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(edge: Edge<SolanaToken | Token | NativeCurrency>) {
		const amountIn =
			await this.priceOracleHelper.estimateTokenAmountFromUsd(
				edge.from,
				QUOTE_USD_AMOUNT_IN,
			)

		const quote = await this.relayService.quote(
			edge.from,
			edge.to,
			amountIn,
		)
		const relayQuote = relayQuoteSchema.parse(quote.rawResult)

		const costInUsd =
			await this.solanaEvmPluginHelper.getExpectedTxCostInUsd(
				edge.from.chainId,
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
				rate: this.solanaEvmPluginHelper.calcRate(
					amountIn,
					BigInt(Math.floor(amountOut)),
				),
				amountOut: BigInt(Math.floor(amountOut)),
				executionCostInUsd: costInUsd,
			}
		}
	}
}
