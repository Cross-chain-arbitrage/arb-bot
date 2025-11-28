import { Injectable } from '@nestjs/common'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Token } from '../../../domain/entities/token'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { EdgeHandler } from '../shared/implementations/edge-handler'
import { MOCK_PROTOCOL } from './constants'

@Injectable()
export class MockSnapshotPlugin extends EdgeHandler implements SnapshotPlugin {
	constructor() {
		super(MOCK_PROTOCOL)
	}

	buildEdgeSnapshotBuilder(edge: Edge<Token>): Promise<EdgeSnapshotBuilder> {
		return Promise.resolve({
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		})
	}

	buildSnapshotFn(edge: Edge<Token>): Promise<EdgeSnapshotFn> {
		return Promise.resolve((amountIn: bigint): Quote => {
			const amountInFormatted = edge.from.formatUnits(amountIn)
			const amountOut = edge.to.parseUnits(amountInFormatted.toString())

			return {
				negativeLogRate: calcRate(amountIn, amountOut),
				amountOut,
				expectedCostInUsd: 0,
			}
		})
	}
}
