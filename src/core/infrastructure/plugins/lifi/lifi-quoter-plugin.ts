import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { TokenBase } from '../../evm/primitives/tokens/TokenBase'
import { LifiService } from '../../lifi/lifi.service'
import { EdgeHandler } from '../shared/implementations/edge-handler'
import { LIFI_PROTOCOL } from './constants'

@Injectable()
export class LifiQuoterPlugin extends EdgeHandler implements QuoterPlugin {
	constructor(private readonly lifiService: LifiService) {
		super(LIFI_PROTOCOL)
	}

	buildEdgeQuoter(edge: Edge<TokenBase>): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge: edge,
			quote: (amountIn: bigint, simulate?: boolean) =>
				this.quote(edge, amountIn, simulate),
		}
	}

	async quote(
		edge: Edge<TokenBase>,
		amountIn: bigint,
		simulate?: boolean,
	): Promise<Quote> {
		const quote = await this.lifiService.quote({
			tokenIn: edge.from,
			tokenOut: edge.to,
			amountIn,
			enableSimulation: simulate,
		})

		return {
			amountOut: quote.amountOut,
			expectedCostInUsd: quote.txCostInUsd,
			negativeLogRate: calcRate(amountIn, quote.amountOut),
		}
	}
}
