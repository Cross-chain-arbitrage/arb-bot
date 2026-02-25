import { Graph } from '../../domain/entities/graph'

export interface GraphVisualizer {
	getLinkToGraph(graph: Graph): string
	saveGraph(graph: Graph): void
}

export const GRAPH_VISUALIZER_TOKEN = Symbol('GRAPH_VISUALIZER_TOKEN')
