import { Graph } from '../../../domain/entities/graph'
export type PluginId = string

export interface GraphWithEdgeOwners<T extends object = object> {
	graph: Graph<T>
	edgeOwners: Record<EdgeId, PluginId>
}
