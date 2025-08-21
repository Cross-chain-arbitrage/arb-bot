import { Graph } from '../../../domain/entities/graph'

export type PluginId = string

export interface GraphWithEdgeOwners {
	graph: Graph
	edgeOwners: Record<EdgeId, PluginId>
}
