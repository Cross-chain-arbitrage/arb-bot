import { Graph } from '../../domain/entities/graph'
import { Token } from '../../domain/entities/token'
import { QuotedPath } from '../../domain/value-objects/path'

export const PATH_FINDER_TOKEN = Symbol('PATH_FINDER_TOKEN')

export interface PathFinder {
	findPaths(
		graph: Graph,
		params: ParamsFindPath[],
	): Promise<QuotedPath[] | null>

	findNegativeSumCycles(
		graph: Graph,
		params: ParamsFindCycle[],
	): Promise<QuotedPath[] | null>
}

export type ParamsFindPath = {
	startToken: Token
	endToken: Token
	startAmount: bigint
}

export type ParamsFindCycle = {
	startToken: Token
	startAmount: bigint
}
