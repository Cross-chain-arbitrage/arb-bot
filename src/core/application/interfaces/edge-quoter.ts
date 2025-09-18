import { Edge } from '../../domain/entities/edge'
import { EdgeId } from '../../domain/value-objects/edge-id'
import { Quote } from '../../domain/value-objects/weighted-graph-snapshot'

export interface EdgeQuoter {
	edge: Edge
	quote: (amountIn: bigint) => Promise<Quote>
}

export type EdgeQuoterRegistry = Map<EdgeId, EdgeQuoter>

export const EDGE_QUOTER_REGISTRY_TOKEN = Symbol('EDGE_QUOTER_REGISTRY_TOKEN')
