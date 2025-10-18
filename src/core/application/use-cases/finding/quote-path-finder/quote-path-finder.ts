import { Injectable } from '@nestjs/common'
import { Edge } from '../../../../domain/entities/edge'
import { Graph } from '../../../../domain/entities/graph'
import { GraphUtils } from '../../../../domain/services/graph-utils'
import { QuotedPath } from '../../../../domain/value-objects/path'
import {
	ParamsFindCycle,
	ParamsFindPath,
	PathFinder,
} from '../../../interfaces/path-finder'
import { PathQuoter } from '../../path-quoter/path-quoter'

@Injectable()
export class QuotePathFinder implements PathFinder {
	constructor(private readonly pathQuoter: PathQuoter) {}

	async findPaths(
		graph: Graph,
		params: ParamsFindPath[],
	): Promise<QuotedPath[]> {
		const quotedPaths: QuotedPath[] = []
		const routes: Edge[][] = []

		for (const param of params) {
			if (param.startToken.id === param.endToken.id) {
				quotedPaths.push({
					quotedStepSequence: [],
					startAmount: param.startAmount,
					endAmount: param.startAmount,
				})

				continue
			}

			const routesForOneParam = GraphUtils.getAllRoutes(
				graph,
				param.startToken,
				param.endToken,
			)

			routes.push(...routesForOneParam)
		}

		const quotedPathsForRoutes: QuotedPath[] = await Promise.all(
			routes.map(async (route) => {
				return this.pathQuoter.quotePath(route, params[0].startAmount)
			}),
		)

		quotedPaths.push(...quotedPathsForRoutes)

		return quotedPaths
	}

	async findNegativeSumCycles(
		graph: Graph,
		params: ParamsFindCycle[],
	): Promise<QuotedPath[]> {
		const routes: Edge[][] = []

		for (const param of params) {
			const routesForOneParam = GraphUtils.getAllRoutes(
				graph,
				param.startToken,
				param.startToken,
			)

			routes.push(...routesForOneParam)
		}

		const quotedPathsForRoutes: QuotedPath[] = await Promise.all(
			routes.map(async (route) => {
				return this.pathQuoter.quotePath(route, params[0].startAmount)
			}),
		)

		return quotedPathsForRoutes
	}
}
