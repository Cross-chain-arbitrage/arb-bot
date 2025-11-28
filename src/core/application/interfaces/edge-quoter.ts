import { Edge } from '../../domain/entities/edge'
import { EdgeId } from '../../domain/value-objects/edge-id'
import { Quote } from '../../domain/value-objects/quote'

export interface EdgeQuoter {
	edge: Edge
	quote: (amountIn: bigint) => Promise<Quote>
}

export type QuotersRegistry = Map<EdgeId, EdgeQuoter>

export const QUOTERS_REGISTRY_TOKEN = Symbol('QUOTERS_REGISTRY_TOKEN')
