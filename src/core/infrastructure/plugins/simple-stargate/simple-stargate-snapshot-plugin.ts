import { Injectable } from '@nestjs/common'
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
import { SimpleStargateService } from '../../layerzero-bridges/stargate/simple-stargate.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmTxCostHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { SIMPLE_STARGATE_PROTOCOL } from './constants'

const QUOTE_USD_AMOUNT_IN = 500

@Injectable()
export class SimpleStargateSnapshotPlugin
	extends EdgeHandler
	implements SnapshotPlugin
{
	constructor(
		readonly simpleStargateService: SimpleStargateService,
		readonly tokenValuator: TokenValuator,
		readonly solanaEvmTxCostHelper: SolanaEvmTxCostHelper,
	) {
		super(SIMPLE_STARGATE_PROTOCOL)
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
		const amountIn = await this.tokenValuator.estimateTokenAmountFromUsd(
			edge.from,
			QUOTE_USD_AMOUNT_IN,
		)

		const { amountOut, gas, feeInNative } =
			await this.simpleStargateService.quote(edge.from, edge.to, amountIn)

		const chainId = TokenIdUtils.parseId(edge.from.id).chainId

		const txCostInUsd =
			await this.solanaEvmTxCostHelper.getExpectedTxCostInUsd(
				chainId,
				gas,
			)

		const bridgeFeeInUsd =
			await this.solanaEvmTxCostHelper.getUsdCostOfNativeAmount(
				chainId,
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
				rate: calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: costInUsd,
			}
		}
	}
}
