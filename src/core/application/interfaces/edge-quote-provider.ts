import { Edge, EdgeId } from '../../domain/entities/edge'
import { Quote } from '../../domain/value-objects/weighted-graph-snapshot'

export interface EdgeQuoteProvider {
	edge: Edge
	buildGetQuoteFunction: () => Promise<(amountIn: bigint) => Quote>
}

export type EdgeQuoteProviderRegistry = Record<EdgeId, EdgeQuoteProvider>
