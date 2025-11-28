import { Module } from '@nestjs/common'
import { ArbitrageExecutionTelemetry } from '../../core/application/use-cases/execution/arbitrage-executor/arbitrage-execution-telemetry'
import { ArbitrageExecutor } from '../../core/application/use-cases/execution/arbitrage-executor/arbitrage-executor'
import { ExecutionPreparer } from '../../core/application/use-cases/execution/execution-preparer/execution-preparer'
import { PathExecutionTelemetry } from '../../core/application/use-cases/execution/path-executor/path-execution-telemetry'
import { PathExecutor } from '../../core/application/use-cases/execution/path-executor/path-executor'
import { PathRecovery } from '../../core/application/use-cases/execution/path-recovery/path-recovery'
import { PathRecoveryTelemetry } from '../../core/application/use-cases/execution/path-recovery/path-recovery-telemetry'
import { StepExecutionTelemetry } from '../../core/application/use-cases/execution/step-executor/step-execution-telemetry'
import { StepExecutor } from '../../core/application/use-cases/execution/step-executor/step-executor'
import { TokenValuatorModule } from '../../core/application/use-cases/token-valuator/token-valuator.module'
import { TgArbitrageNotifierModule } from '../../core/infrastructure/tg-notifier/tg-arbitrage-notifier/tg-arbitrage-notifier.module'
import { ExecutorsRegistryModule } from '../executors-registry/executors-registry.module'
import { GraphBuilderModule } from '../graph-builder/graph-builder.module'
import { PathFinderModule } from '../path-finder/path-finder.module'
import { QuotersRegistryModule } from '../quoters-registry/quoters-registry.module'

@Module({
	imports: [
		TgArbitrageNotifierModule,
		TokenValuatorModule,
		GraphBuilderModule,
		ExecutorsRegistryModule,
		PathFinderModule,
		QuotersRegistryModule,
	],
	providers: [
		PathRecovery,
		PathRecoveryTelemetry,

		ArbitrageExecutor,
		ArbitrageExecutionTelemetry,

		PathExecutor,
		PathExecutionTelemetry,

		StepExecutor,
		StepExecutionTelemetry,

		ExecutionPreparer,
	],
	exports: [ArbitrageExecutor, ExecutionPreparer],
})
export class ArbitrageExecutorModule {}
