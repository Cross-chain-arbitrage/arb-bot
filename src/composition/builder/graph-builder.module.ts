import { Module } from '@nestjs/common'
import { GraphPlugin } from '../../core/application/interfaces/graph-plugin'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { graphPluginModules, graphPlugins } from './graph-plugins'

export const GRAPH_WITH_EDGE_OWNERS_TOKEN = Symbol(
	'GRAPH_WITH_EDGE_OWNERS_TOKEN',
)

@Module({
	imports: [...graphPluginModules],
	providers: [
		GraphBuilder,
		{
			provide: GRAPH_WITH_EDGE_OWNERS_TOKEN,

			inject: [GraphBuilder, ...graphPlugins],

			useFactory: async (
				graphBuilder: GraphBuilder,
				...pluginModules: GraphPlugin[]
			) => {
				return graphBuilder.buildGraphWithEdgeOwners(pluginModules)
			},
		},
	],
	exports: [GRAPH_WITH_EDGE_OWNERS_TOKEN, GraphBuilder],
})
export class GraphBuilderModule {}
