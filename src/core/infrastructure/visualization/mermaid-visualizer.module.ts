import { Module } from '@nestjs/common'
import { GRAPH_VISUALIZER_TOKEN } from '../../application/interfaces/graph-visualizer'
import { MermaidVisualizer } from './mermaid-visualizer'

@Module({
	imports: [],
	providers: [
		{ provide: GRAPH_VISUALIZER_TOKEN, useClass: MermaidVisualizer },
	],
	exports: [GRAPH_VISUALIZER_TOKEN],
})
export class MermainVisualizerModule {}
