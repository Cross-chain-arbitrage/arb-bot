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
import { SimpleStargateService } from '../../layerzero-bridges/stargate/simple-stargate.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmPluginHelper } from '../shared-utils/chain-specific/solana-evm/solana-evm-tx-cost.utils'
import { PriceOracleHelper } from '../shared-utils/price-oracle-helper'
import { SimpleStargatePlugin } from './simple-stargate-plugin'

const QUOTE_USD_AMOUNT_IN = 500

@Injectable()
export class SimpleStargateSnapshotPlugin
	extends SimpleStargatePlugin
	implements SnapshotPlugin
{
	constructor(
		readonly simpleStargateService: SimpleStargateService,
		readonly priceOracleHelper: PriceOracleHelper,
		readonly solanaEvmPluginHelper: SolanaEvmPluginHelper,
	) {
		super()
	}

	buildEdgeSnapshotBuilder(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
	): EdgeSnapshotBuilder {
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
