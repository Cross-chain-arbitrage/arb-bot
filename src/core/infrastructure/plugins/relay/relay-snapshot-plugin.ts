import { Injectable } from '@nestjs/common'
import z from 'zod'
import { convertDecimals } from '../../../../utils/common'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { TokenValuator } from '../../../application/use-cases/token-valuator/token-valuator'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { RelayService } from '../../relay/relay-service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmTxCostHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { RELAY_PROTOCOL } from './constants'

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
export class RelaySnapshotPlugin extends EdgeHandler implements SnapshotPlugin {
	constructor(
		private readonly relayService: RelayService,
		readonly solanaEvmTxCostHelper: SolanaEvmTxCostHelper,
		readonly tokenValuator: TokenValuator,
	) {
		super(RELAY_PROTOCOL)
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
		const amountIn = await this.tokenValuator.estimateTokenAmountFromUsd(
			edge.from,
			QUOTE_USD_AMOUNT_IN,
		)

		const quote = await this.relayService.quote(
			edge.from,
			edge.to,
			amountIn,
		)

		const costInUsd =
			await this.solanaEvmTxCostHelper.getUsdCostOfNativeAmount(
				TokenIdUtils.parseId(edge.from.id).chainId,
				quote.gasInNative,
			)

		const relayQuote = relayQuoteSchema.parse(quote.rawResult)

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
