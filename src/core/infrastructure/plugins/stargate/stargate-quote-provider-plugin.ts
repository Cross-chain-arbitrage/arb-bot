import { Injectable } from '@nestjs/common'
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
import { StargateService } from '../../layerzero-bridges/stargate/stargate-service'
import {
	estimateTokenAmountFromUsd,
	estimateUsdFromTokenAmount,
} from '../helpers/context-helpers'
import { getExpectedTxCostInUsd } from '../helpers/evm-context-helpers'
import { calcRate } from '../helpers/helpers'
import { StargateGraphPlugin } from './stargate-graph-plugin'

const QUOTE_USD_AMOUNT_IN = 500

@Injectable()
export class StargateQuoteProviderPlugin
	extends StargateGraphPlugin
	implements QuoteProviderPlugin
{
	constructor(
		private readonly stargateService: StargateService,
		readonly priceOracle: PriceOracle,
		readonly tokenUtils: TokenUtils,
		readonly gasPriceOracleService: GasPriceOracleService,
	) {
		super()
	}

	buildEdgeQuoteProvider(
		edge: Edge<Token | NativeCurrency>,
	): EdgeQuoteProvider {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(
		edge: Edge<Token | NativeCurrency>,
	): Promise<EdgeSnapshotFn> {
		const amountIn = await estimateTokenAmountFromUsd.bind(this)(
			edge.from,
			QUOTE_USD_AMOUNT_IN,
		)

		const { amountOut, lzFee, gas } =
			await this.stargateService.quoteBridge(
				edge.from,
				amountIn,
				edge.to.chainId,
			)

		const txCostInUsd = await getExpectedTxCostInUsd.bind(this)(
			edge.from.chainId,
			gas,
		)

		const bridgeFeeInUsd = await estimateUsdFromTokenAmount.bind(this)(
			lzFee.underlyingToken,
			lzFee.amount,
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
				rate: calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: costInUsd,
			}
		}
	}
}
