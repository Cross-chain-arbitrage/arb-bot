import { Module } from '@nestjs/common'
import { ExecutorPlugin } from '../../core/application/interfaces/graph-plugin'
import { ArbitrageExecutor } from '../../core/application/use-cases/execution/arbitrage-executor/arbitrage-executor'
import {
	EDGE_EXECUTOR_REGISTRY_TOKEN,
	PathExecutor,
} from '../../core/application/use-cases/execution/path-executor/path-executor'
import { GRAPH_WITH_EDGE_OWNERS_TOKEN } from '../../core/application/use-cases/graph-builder/di-tokens'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GraphWithEdgeOwners } from '../../core/application/use-cases/graph-builder/types'
import { GraphBuilderModule } from '../builder/graph-builder.module'
import { executorPluginModules, executorPlugins } from './executor-plugins'

@Module({
	imports: [GraphBuilderModule, ...executorPluginModules],
	providers: [
		ArbitrageExecutor,
		PathExecutor,
		{
			provide: EDGE_EXECUTOR_REGISTRY_TOKEN,
			inject: [
				GraphBuilder,
				GRAPH_WITH_EDGE_OWNERS_TOKEN,
				...executorPlugins,
			],
			useFactory: (
				graphBuilder: GraphBuilder,
				graphWithEdgeOwners: GraphWithEdgeOwners,
				...executorPlugins: ExecutorPlugin[]
			) => {
				return graphBuilder.buildExecutorRegistry(
					graphWithEdgeOwners.graph,
					executorPlugins,
					graphWithEdgeOwners.edgeOwners,
				)
			},
		},
	],
	exports: [ArbitrageExecutor],
})
export class ArbitrageExecutorModule {}
