import { Edge, EdgeId } from '../../domain/entities/edge'
import { Quote } from '../../domain/value-objects/weighted-graph-snapshot'

export type EdgeSnapshotFn = (amountIn: bigint) => Quote

export interface EdgeSnapshotBuilder {
	edge: Edge
	buildEdgeSnapshotFn: () => Promise<EdgeSnapshotFn>
}

export type EdgeSnapshotBuilderRegistry = Record<EdgeId, EdgeSnapshotBuilder>
