import { Module } from '@nestjs/common'
import { EXECUTORS_REGISTRY_TOKEN } from '../../core/application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../core/application/interfaces/graph-plugin'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { Graph } from '../../core/domain/entities/graph'
import { GraphBuilderModule } from '../graph-builder/graph-builder.module'
import { executorPluginModules, executorPlugins } from './executor-plugins'

@Module({
	imports: [GraphBuilderModule, ...executorPluginModules],
	providers: [
		{
			provide: EXECUTORS_REGISTRY_TOKEN,
			inject: [GraphBuilder, GRAPH_TOKEN, ...executorPlugins],
			useFactory: (
				graphBuilder: GraphBuilder,
				graph: Graph,
				...executorPlugins: ExecutorPlugin[]
			) => {
				return graphBuilder.buildExecutorRegistry(
					graph,
					executorPlugins,
				)
			},
		},
	],
	exports: [EXECUTORS_REGISTRY_TOKEN],
})
export class ExecutorsRegistryModule {}
