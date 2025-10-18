import { Inject, Injectable } from '@nestjs/common'
import { Edge } from '../../../domain/entities/edge'
import { QuotedPath, QuotedStep } from '../../../domain/value-objects/path'
import {
	EDGE_QUOTER_REGISTRY_TOKEN,
	EdgeQuoterRegistry,
} from '../../interfaces/edge-quoter'

@Injectable()
export class PathQuoter {
	constructor(
		@Inject(EDGE_QUOTER_REGISTRY_TOKEN)
		private readonly edgeQuoterRegistry: EdgeQuoterRegistry,
	) {}

	async quotePath(edges: Edge[], amountIn: bigint): Promise<QuotedPath> {
		const quotedStepSequence: QuotedStep[] = []
		let nextAmountIn = amountIn
		const startAmount = amountIn

		for (const edge of edges) {
			const edgeQuoter = this.edgeQuoterRegistry.get(edge.id)

			if (!edgeQuoter) {
				throw new Error(`Edge quoter not found for edge ${edge.id}`)
			}

			const quote = await edgeQuoter.quote(nextAmountIn)

			quotedStepSequence.push({ edge, quote })

			nextAmountIn = quote.amountOut
		}

		return {
			quotedStepSequence,
			startAmount,
			endAmount: nextAmountIn,
		}
	}
}
