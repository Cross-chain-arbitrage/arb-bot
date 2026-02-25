import { Inject, Injectable, Logger } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import {
	GRAPH_VISUALIZER_TOKEN,
	GraphVisualizer,
} from '../../../interfaces/graph-visualizer'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'

@Injectable()
export class GraphSaver {
	logger = new Logger(GraphSaver.name)

	constructor(
		@Inject(GRAPH_TOKEN) graph: Graph,
		@Inject(GRAPH_VISUALIZER_TOKEN) graphVisualizer: GraphVisualizer,
	) {
		try {
			graphVisualizer.saveGraph(graph)
		} catch (error) {
			this.logger.error(error)
		}
	}
}
