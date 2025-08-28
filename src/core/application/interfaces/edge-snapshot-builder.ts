import { Edge } from '../../domain/entities/edge'
import { EdgeId } from '../../domain/value-objects/edge-id'
import { Quote } from '../../domain/value-objects/weighted-graph-snapshot'

export type EdgeSnapshotFn = (amountIn: bigint) => Quote

export interface EdgeSnapshotBuilder {
	edge: Edge
	buildEdgeSnapshotFn: () => Promise<EdgeSnapshotFn>
}

export type EdgeSnapshotBuilderRegistry = Record<EdgeId, EdgeSnapshotBuilder>
