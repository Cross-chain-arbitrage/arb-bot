import { Injectable } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
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
		const quotedPaths = await Promise.all(
			params.map(async (param) => {
				if (param.startToken.id === param.endToken.id) {
					return {
						quotedStepSequence: [],
						startAmount: param.startAmount,
						endAmount: param.startAmount,
					}
				}
				return this.findBestPath(graph, param)
			}),
		)

		return quotedPaths
	}

	private async findBestPath(
		graph: Graph,
		param: ParamsFindPath,
	): Promise<QuotedPath> {
		const routes = GraphUtils.getAllRoutes(
			graph,
			param.startToken,
			param.endToken,
		)

		const quotedPaths = await Promise.all(
			routes.map(async (route) => {
				return this.pathQuoter.quotePath(route, param.startAmount)
			}),
		)

		const bestPath = quotedPaths.reduce((best, current) => {
			if (best.endAmount > current.endAmount) {
				return best
			}

			return current
		}, quotedPaths[0])

		return bestPath
	}

	async findNegativeSumCycles(
		graph: Graph,
		params: ParamsFindCycle[],
	): Promise<QuotedPath[] | null> {
		const quotedPathsForRoutes: (QuotedPath | null)[] = await Promise.all(
			params.map(async (param) => {
				return this.findBestCycle(
					graph,
					param.startToken,
					param.startAmount,
				)
			}),
		)

		const filteredQuotedPathsForRoutes: QuotedPath[] =
			quotedPathsForRoutes.filter((path) => path !== null)

		if (filteredQuotedPathsForRoutes.length === 0) {
			return null
		}

		return filteredQuotedPathsForRoutes
	}

	async findBestCycle(
		graph: Graph,
		startToken: Token,
		startAmount: bigint,
	): Promise<QuotedPath | null> {
		const allRoutes = GraphUtils.getAllRoutes(graph, startToken, startToken)

		const quotedPaths: QuotedPath[] = await Promise.all(
			allRoutes.map(async (route) => {
				return this.pathQuoter.quotePath(route, startAmount)
			}),
		)

		const bestCycle = quotedPaths.reduce((best, current) => {
			const bestProfit =
				best === null ? 0 : best.endAmount - best.startAmount

			const currentProfit = current.endAmount - current.startAmount

			if (currentProfit > bestProfit) {
				return current
			}

			return best
		}, quotedPaths[0])

		if (bestCycle.endAmount > bestCycle.startAmount) {
			return bestCycle
		}

		return null
	}
}
