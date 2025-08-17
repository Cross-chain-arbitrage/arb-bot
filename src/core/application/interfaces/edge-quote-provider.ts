import { Edge, EdgeId } from '../../domain/entities/edge'
import { Quote } from '../../domain/value-objects/weighted-graph-snapshot'

type EdgeSnapshotFn = (amountIn: bigint) => Quote

export interface EdgeQuoteProvider {
	edge: Edge
	buildEdgeSnapshotFn: () => Promise<EdgeSnapshotFn>
}

export type EdgeQuoteProviderRegistry = Record<EdgeId, EdgeQuoteProvider>
