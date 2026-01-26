import { Inject, Injectable } from '@nestjs/common'
import { Edge } from '../../../domain/entities/edge'
import { QuotedPath, QuotedStep } from '../../../domain/value-objects/path'
import {
	QUOTERS_REGISTRY_TOKEN,
	QuotersRegistry,
} from '../../interfaces/edge-quoter'

@Injectable()
export class PathQuoter {
	constructor(
		@Inject(QUOTERS_REGISTRY_TOKEN)
		private readonly edgeQuoterRegistry: QuotersRegistry,
	) {}

	async quotePath(
		edges: Edge[],
		amountIn: bigint,
		simulate?: boolean,
	): Promise<QuotedPath> {
		const quotedStepSequence: QuotedStep[] = []
		let nextAmountIn = amountIn
		const startAmount = amountIn

		for (const edge of edges) {
			const edgeQuoter = this.edgeQuoterRegistry.get(edge.id)

			if (!edgeQuoter) {
				throw new Error(`Edge quoter not found for edge ${edge.id}`)
			}

			const quote = await edgeQuoter.quote(nextAmountIn, simulate)

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
