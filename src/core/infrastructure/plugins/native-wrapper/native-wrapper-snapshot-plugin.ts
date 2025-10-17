import { Injectable } from '@nestjs/common'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { WrappedNative } from '../../evm/primitives/tokens/WrappedNative'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { NATIVE_WRAPPER_GAS_PER_TX, NATIVE_WRAPPER_PROTOCOL } from './constants'

@Injectable()
export class NativeWrapperSnapshotPlugin
	extends EdgeHandler
	implements SnapshotPlugin
{
	constructor(private readonly evmTxCostHelper: EvmTxCostHelper) {
		super(NATIVE_WRAPPER_PROTOCOL)
	}

	async buildEdgeSnapshotBuilder(
		edge: Edge<NativeCurrency | WrappedNative>,
	): Promise<EdgeSnapshotBuilder> {
		const edgeSnapshotBuilder = {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}

		return Promise.resolve(edgeSnapshotBuilder)
	}

	async buildSnapshotFn(
		edge: Edge<NativeCurrency | WrappedNative>,
	): Promise<EdgeSnapshotFn> {
		const txCostInUsd = await this.evmTxCostHelper.getExpectedTxCostInUsd(
			edge.from.chainId,
			NATIVE_WRAPPER_GAS_PER_TX,
		)

		return (amountIn: bigint): Quote => {
			return {
				negativeLogRate: calcRate(amountIn, amountIn),
				amountOut: amountIn,
				expectedCostInUsd: txCostInUsd,
			}
		}
	}
}
