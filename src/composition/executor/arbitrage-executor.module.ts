import { Module } from '@nestjs/common'
import { ARBITRAGE_NOTIFIER_TOKEN } from '../../core/application/interfaces/arbitrage-notifier'
import { ExecutorPlugin } from '../../core/application/interfaces/graph-plugin'
import { ArbitrageExecutionTelemetry } from '../../core/application/use-cases/execution/arbitrage-executor/arbitrage-execution-telemetry'
import { ArbitrageExecutor } from '../../core/application/use-cases/execution/arbitrage-executor/arbitrage-executor'
import { EDGE_EXECUTOR_REGISTRY_TOKEN } from '../../core/application/use-cases/execution/edge-executor-registry-token'
import { PathExecutionTelemetry } from '../../core/application/use-cases/execution/path-executor/path-execution-telemetry'
import { PathExecutor } from '../../core/application/use-cases/execution/path-executor/path-executor'
import { StepExecutionTelemetry } from '../../core/application/use-cases/execution/step-executor/step-execution-telemetry'
import { StepExecutor } from '../../core/application/use-cases/execution/step-executor/step-executor'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { Graph } from '../../core/domain/entities/graph'
import { TgArbitrageNotifier } from '../../core/infrastructure/tg-notifier/tg-arbitrage-notifier'
import { GraphBuilderModule } from '../builder/graph-builder.module'
import { executorPluginModules, executorPlugins } from './executor-plugins'

@Module({
	imports: [GraphBuilderModule, ...executorPluginModules],
	providers: [
		ArbitrageExecutor,
		PathExecutor,
		PathExecutionTelemetry,
		StepExecutionTelemetry,
		ArbitrageExecutionTelemetry,
		StepExecutor,
		{
			provide: ARBITRAGE_NOTIFIER_TOKEN,
			useClass: TgArbitrageNotifier,
		},
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
