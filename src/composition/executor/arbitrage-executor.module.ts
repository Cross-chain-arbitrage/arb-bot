import { Module } from '@nestjs/common'
import { EDGE_EXECUTOR_REGISTRY_TOKEN } from '../../core/application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../core/application/interfaces/graph-plugin'
import { ArbitrageExecutionTelemetry } from '../../core/application/use-cases/execution/arbitrage-executor/arbitrage-execution-telemetry'
import { ArbitrageExecutor } from '../../core/application/use-cases/execution/arbitrage-executor/arbitrage-executor'
import { ExecutionPreparer } from '../../core/application/use-cases/execution/execution-preparer/execution-preparer'
import { PathExecutionTelemetry } from '../../core/application/use-cases/execution/path-executor/path-execution-telemetry'
import { PathExecutor } from '../../core/application/use-cases/execution/path-executor/path-executor'
import { PathRecovery } from '../../core/application/use-cases/execution/path-recovery/path-recovery'
import { StepExecutionTelemetry } from '../../core/application/use-cases/execution/step-executor/step-execution-telemetry'
import { StepExecutor } from '../../core/application/use-cases/execution/step-executor/step-executor'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { TokenValuatorModule } from '../../core/application/use-cases/token-valuator/token-valuator.module'
import { Graph } from '../../core/domain/entities/graph'
import { TgArbitrageNotifierModule } from '../../core/infrastructure/tg-notifier/tg-arbitrage-notifier/tg-arbitrgage-notifier.module'
import { BalanceOracleModule } from '../balance-oracle/balance-oracle.module'
import { GraphBuilderModule } from '../builder/graph-builder.module'
import { ArbitrageFinderModule } from '../finder/arbitrage-finder.module'
import { executorPluginModules, executorPlugins } from './executor-plugins'

@Module({
	imports: [
		TgArbitrageNotifierModule,
		TokenValuatorModule,
		GraphBuilderModule,
		ArbitrageFinderModule,
		BalanceOracleModule,
		...executorPluginModules,
	],
	providers: [
		PathRecovery,
		ArbitrageExecutor,
		PathExecutor,
		PathExecutionTelemetry,
		StepExecutionTelemetry,
		ArbitrageExecutionTelemetry,
		StepExecutor,
		ExecutionPreparer,
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
	exports: [
		ArbitrageExecutor,
		EDGE_EXECUTOR_REGISTRY_TOKEN,
		ExecutionPreparer,
	],
})
export class ArbitrageExecutorModule {}
