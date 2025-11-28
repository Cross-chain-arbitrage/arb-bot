import { Module } from '@nestjs/common'
import { QUOTERS_REGISTRY_TOKEN } from '../../core/application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../core/application/interfaces/graph-plugin'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { Graph } from '../../core/domain/entities/graph'
import { GraphBuilderModule } from '../graph-builder/graph-builder.module'
import { quoterPluginModules, quoterPlugins } from './quoter-plugins'

@Module({
	imports: [GraphBuilderModule, ...quoterPluginModules],
	providers: [
		{
			provide: QUOTERS_REGISTRY_TOKEN,
			inject: [GraphBuilder, GRAPH_TOKEN, ...quoterPlugins],
			useFactory: (
				graphBuilder: GraphBuilder,
				graph: Graph,
				...quoterPlugins: QuoterPlugin[]
			) => {
				return graphBuilder.buildQuoterRegistry(graph, quoterPlugins)
			},
		},
	],
	exports: [QUOTERS_REGISTRY_TOKEN],
})
export class QuotersRegistryModule {}
