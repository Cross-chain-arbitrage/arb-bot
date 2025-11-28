import { Edge } from '../../domain/entities/edge'
import { EdgeId } from '../../domain/value-objects/edge-id'
import { Quote } from '../../domain/value-objects/quote'

export type EdgeSnapshotFn = (amountIn: bigint) => Quote

export interface EdgeSnapshotBuilder {
	edge: Edge
	buildEdgeSnapshotFn: () => Promise<EdgeSnapshotFn>
}

export type SnapshotBuildersRegistry = Map<EdgeId, EdgeSnapshotBuilder>

export const SNAPSHOT_BUILDERS_REGISTRY_TOKEN = Symbol(
	'SNAPSHOT_BUILDERS_REGISTRY_TOKEN',
)
