import { GraphWithEdgeOwners } from '../use-cases/graph-builder/types'

export interface GraphVisualizer {
	getLinkToGraph(graphWithEdgeOwners: GraphWithEdgeOwners): string
}

export const GRAPH_VISUALIZER_TOKEN = Symbol('GRAPH_VISUALIZER_TOKEN')
