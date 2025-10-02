import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { TokenBase } from '../../evm/primitives/tokens/TokenBase'
import { LifiService } from '../../lifi/lifi.service'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { LIFI_PROTOCOL } from './constants'

@Injectable()
export class LifiQuoterPlugin extends EdgeHandler implements QuoterPlugin {
	constructor(private readonly lifiService: LifiService) {
		super(LIFI_PROTOCOL)
	}

	buildEdgeQuoter(edge: Edge<TokenBase>): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge: edge,
			quote: (amountIn: bigint) => this.quote(edge, amountIn),
		}
	}

	async quote(edge: Edge<TokenBase>, amountIn: bigint): Promise<Quote> {
		const quote = await this.lifiService.quote(edge.from, edge.to, amountIn)

		return {
			amountOut: quote.amountOut,
			executionCostInUsd: quote.txCostInUsd,
			rate: calcRate(amountIn, quote.amountOut),
		}
	}
}
