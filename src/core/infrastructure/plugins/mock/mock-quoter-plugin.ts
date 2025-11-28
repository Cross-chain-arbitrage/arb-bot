import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Token } from '../../../domain/entities/token'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { EdgeHandler } from '../shared/implementations/edge-handler'
import { MOCK_PROTOCOL } from './constants'

@Injectable()
export class MockQuoterPlugin extends EdgeHandler implements QuoterPlugin {
	constructor() {
		super(MOCK_PROTOCOL)
	}

	buildEdgeQuoter(edge: Edge<Token>): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge,
			quote: (amountIn: bigint) => this.quote(edge, amountIn),
		}
	}

	quote(edge: Edge<Token>, amountIn: bigint): Promise<Quote> {
		const amountInFormatted = edge.from.formatUnits(amountIn)
		const amountOut = edge.to.parseUnits(amountInFormatted.toString())

		return Promise.resolve({
			negativeLogRate: calcRate(amountIn, amountOut),
			amountOut,
			expectedCostInUsd: 0,
		})
	}
}
