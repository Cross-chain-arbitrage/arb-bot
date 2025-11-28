import { Module } from '@nestjs/common'
import { GraphPlugin } from '../../core/application/interfaces/graph-plugin'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { graphPluginModules, graphPlugins } from './graph-plugins'

@Module({
	imports: [...graphPluginModules],
	providers: [
		GraphBuilder,
		{
			provide: GRAPH_TOKEN,
			inject: [GraphBuilder, ...graphPlugins],
			useFactory: async (
				graphBuilder: GraphBuilder,
				...graphPlugins: GraphPlugin[]
			) => {
				return await graphBuilder.buildGraph(graphPlugins)
			},
		},
	],
	exports: [GRAPH_TOKEN, GraphBuilder],
})
export class GraphBuilderModule {}
