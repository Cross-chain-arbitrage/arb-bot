import { Injectable } from '@nestjs/common'
import { Edge } from '../../../domain/entities/edge'
import { QuotedPath } from '../../../domain/value-objects/arbitrage-cycle'
import { EdgeQuoterRegistry } from '../../interfaces/edge-quoter'

@Injectable()
export class PathQuoter {
	constructor(private readonly edgeQuoterRegistry: EdgeQuoterRegistry) {}

	async quotePath(path: Edge[], amountIn: bigint): Promise<QuotedPath> {
		const quotedPath: QuotedPath = []
		let nextAmountIn = amountIn

		for (const edge of path) {
			const edgeQuoter = this.edgeQuoterRegistry.get(edge.id)

			if (!edgeQuoter) {
				throw new Error(`Edge quoter not found for edge ${edge.id}`)
			}

			const quote = await edgeQuoter.quote(nextAmountIn)

			quotedPath.push({ edge, quote })

			nextAmountIn = quote.amountOut
		}

		return quotedPath
	}
}
