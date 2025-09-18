import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { WrappedNative } from '../../evm/primitives/tokens/WrappedNative'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { NATIVE_WRAPPER_GAS_PER_TX, NATIVE_WRAPPER_PROTOCOL } from './constants'

@Injectable()
export class NativeWrapperQuoterPlugin
	extends EdgeHandler
	implements QuoterPlugin
{
	constructor(private readonly evmTxCostHelper: EvmTxCostHelper) {
		super(NATIVE_WRAPPER_PROTOCOL)
	}

	buildEdgeQuoter(
		edge: Edge<NativeCurrency | WrappedNative>,
	): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge,
			quote: (amountIn: bigint) => this.quote(edge, amountIn),
		}
	}

	async quote(
		edge: Edge<NativeCurrency | WrappedNative>,
		amountIn: bigint,
	): Promise<Quote> {
		const txCostInUsd = await this.evmTxCostHelper.getExpectedTxCostInUsd(
			edge.from.chainId,
			NATIVE_WRAPPER_GAS_PER_TX,
		)

		return {
			rate: calcRate(amountIn, amountIn),
			amountOut: amountIn,
			executionCostInUsd: txCostInUsd,
		}
	}
}
