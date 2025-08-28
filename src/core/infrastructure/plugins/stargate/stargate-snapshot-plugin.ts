import { Injectable } from '@nestjs/common'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { StargateService } from '../../layerzero-bridges/stargate/stargate-service'
import { EvmPluginHelper } from '../shared-utils/chain-specific/evm/evm-tx-cost.utils'
import { PriceOracleHelper } from '../shared-utils/price-oracle-helper'
import { StargatePlugin } from './stargate-plugin'

const QUOTE_USD_AMOUNT_IN = 500

@Injectable()
export class StargateSnapshotPlugin
	extends StargatePlugin
	implements SnapshotPlugin
{
	constructor(
		private readonly stargateService: StargateService,
		readonly evmPluginHelper: EvmPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
	}

	buildEdgeSnapshotBuilder(
		edge: Edge<Token | NativeCurrency>,
	): EdgeSnapshotBuilder {
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
		const amountIn =
			await this.priceOracleHelper.estimateTokenAmountFromUsd(
				edge.from,
				QUOTE_USD_AMOUNT_IN,
			)

		const { amountOut, lzFee, gas } =
			await this.stargateService.quoteBridge(
				edge.from,
				amountIn,
				edge.to.chainId,
			)

		const txCostInUsd = await this.evmPluginHelper.getExpectedTxCostInUsd(
			edge.from.chainId,
			gas,
		)

		const bridgeFeeInUsd =
			await this.priceOracleHelper.estimateUsdFromTokenAmount(
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
				rate: this.evmPluginHelper.calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: costInUsd,
			}
		}
	}
}
