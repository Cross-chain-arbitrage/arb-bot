import { Injectable } from '@nestjs/common'
import {
	EdgeQuoteProvider,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-quote-provider'
import { QuoteProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { SimpleStargateService } from '../../layerzero-bridges/stargate/simple-stargate.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { SolanaEvmPluginHelper } from '../helpers/solana-evm-plugin-helper'
import { SimpleStargateGraphPlugin } from './simple-stargate-graph-plugin'

const QUOTE_USD_AMOUNT_IN = 500

@Injectable()
export class SimpleStargateQuoteProviderPlugin
	extends SimpleStargateGraphPlugin
	implements QuoteProviderPlugin
{
	constructor(
		readonly simpleStargateService: SimpleStargateService,
		readonly priceOracleHelper: PriceOracleHelper,
		readonly solanaEvmPluginHelper: SolanaEvmPluginHelper,
	) {
		super()
	}

	buildEdgeQuoteProvider(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
	): EdgeQuoteProvider {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
	): Promise<EdgeSnapshotFn> {
		const amountIn =
			await this.priceOracleHelper.estimateTokenAmountFromUsd(
				edge.from,
				QUOTE_USD_AMOUNT_IN,
			)

		const { amountOut, gas, feeInNative } =
			await this.simpleStargateService.quote(edge.from, edge.to, amountIn)

		const txCostInUsd =
			await this.solanaEvmPluginHelper.getExpectedTxCostInUsd(
				edge.from.chainId,
				gas,
			)

		const bridgeFeeInUsd =
			await this.solanaEvmPluginHelper.getUsdCostOfNativeAmount(
				edge.from.chainId,
				feeInNative,
			)

		const executionCostInUsd = bridgeFeeInUsd + txCostInUsd

		return this.buildApproximatedQuoteFunction(
			amountIn,
			amountOut,
			executionCostInUsd,
		)
	}

	buildApproximatedQuoteFunction(
		amountIn: bigint,
		amountOut: bigint,
		costInUsd: number,
	): EdgeSnapshotFn {
		const k = Number(amountOut) / Number(amountIn)

		return (amountIn: bigint): Quote => {
			const amountOutNumber = k * Number(amountIn)

			const amountOut = BigInt(Math.floor(amountOutNumber))

			return {
				rate: this.solanaEvmPluginHelper.calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: costInUsd,
			}
		}
	}
}
