import { Graph } from '../../domain/entities/graph'

export interface GraphVisualizer {
	getLinkToGraph(graph: Graph): string
}

export const GRAPH_VISUALIZER_TOKEN = Symbol('GRAPH_VISUALIZER_TOKEN')
