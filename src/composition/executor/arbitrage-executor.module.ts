import { Module } from '@nestjs/common'
import { ExecutorPlugin } from '../../core/application/interfaces/graph-plugin'
import { ArbitrageExecutor } from '../../core/application/use-cases/execution/arbitrage-executor/arbitrage-executor'
import { ExecutionTelemetry } from '../../core/application/use-cases/execution/execution-telemetry/execution-telemetry'
import {
	EDGE_EXECUTOR_REGISTRY_TOKEN,
	PathExecutor,
} from '../../core/application/use-cases/execution/path-executor/path-executor'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { Graph } from '../../core/domain/entities/graph'
import { GraphBuilderModule } from '../builder/graph-builder.module'
import { executorPluginModules, executorPlugins } from './executor-plugins'

@Module({
	imports: [GraphBuilderModule, ...executorPluginModules],
	providers: [
		ArbitrageExecutor,
		PathExecutor,
		ExecutionTelemetry,
		{
			provide: EDGE_EXECUTOR_REGISTRY_TOKEN,
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
	exports: [ArbitrageExecutor, EDGE_EXECUTOR_REGISTRY_TOKEN],
})
export class ArbitrageExecutorModule {}
