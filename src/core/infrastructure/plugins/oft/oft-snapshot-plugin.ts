import { Injectable } from '@nestjs/common'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { TokenValuator } from '../../../application/use-cases/token-valuator/token-valuator'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { OftService } from '../../layerzero-bridges/oft/oft.service'
import { EvmTxCostHelper } from '../shared/helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared/implementations/edge-handler'
import { OFT_PROTOCOL } from './constants'

const QUOTE_USD_AMOUNT_IN = 500

@Injectable()
export class OftSnapshotPlugin extends EdgeHandler implements SnapshotPlugin {
	constructor(
		private readonly oftService: OftService,
		readonly evmTxCostHelper: EvmTxCostHelper,
		readonly tokenValuator: TokenValuator,
	) {
		super(OFT_PROTOCOL)
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
		const amountIn = await this.tokenValuator.estimateTokenAmountFromUsd(
			edge.from,
			QUOTE_USD_AMOUNT_IN,
		)

		const { amountOut, lzFee, gas } = await this.oftService.quoteBridge(
			edge.from,
			edge.to,
			amountIn,
		)

		const txCostInUsd = await this.evmTxCostHelper.getExpectedTxCostInUsd(
			edge.from.chainId,
			gas,
		)

		const bridgeFeeInUsd =
			await this.tokenValuator.estimateUsdFromTokenAmount(
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
				negativeLogRate: calcRate(amountIn, amountOut),
				amountOut,
				expectedCostInUsd: costInUsd,
			}
		}
	}
}
