import { Injectable } from '@nestjs/common'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { StargateService } from '../../layerzero-bridges/stargate/stargate-service'
import { PriceOracleHelper } from '../../price-oracle/price-oracle-helper'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { STARGATE_PROTOCOL } from './constants'

const QUOTE_USD_AMOUNT_IN = 500

@Injectable()
export class StargateSnapshotPlugin
	extends EdgeHandler
	implements SnapshotPlugin
{
	constructor(
		private readonly stargateService: StargateService,
		readonly evmTxCostHelper: EvmTxCostHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super(STARGATE_PROTOCOL)
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

		const txCostInUsd = await this.evmTxCostHelper.getExpectedTxCostInUsd(
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
				rate: calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: costInUsd,
			}
		}
	}
}
