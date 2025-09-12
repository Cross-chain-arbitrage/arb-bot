import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { BalanceReporterModule } from './composition/balance-reporter/balance-reporter.module'
import { GraphBuilderModule } from './composition/builder/graph-builder.module'
import { ArbitrageExecutorModule } from './composition/executor/arbitrage-executor.module'
import { ArbitrageFinderModule } from './composition/finder/arbitrage-finder.module'
import { loadConfig } from './configuration/configuration'
import { GRAPH_VISUALIZER_TOKEN } from './core/application/interfaces/graph-visualizer'
import { ArbitrageOrchestrator } from './core/application/use-cases/arbitrage-orchestrator/arbitrage-orchestrator'
import { ExecutionPreparer } from './core/application/use-cases/execution/execution-preparer/execution-preparer'
import { PriceOracleModule } from './core/infrastructure/price-oracle/price-oracle.module'
import { MermaidVisualizer } from './core/infrastructure/visualization/mermaid-visualizer'
import { ArbitrageScheduler } from './core/presentation/arbitrage-scheduler/arbitrage-scheduler'
import { transport } from './utils/logging-config'

@Module({
	imports: [
		LoggerModule.forRoot({
			pinoHttp: {
				transport,
				formatters: {
					level(label, number) {
						return { level: label }
					},
				},
			},
		}),
		GraphBuilderModule,
		ArbitrageFinderModule,
		ArbitrageExecutorModule,
		PriceOracleModule,
		BalanceReporterModule,
		ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
	],
	providers: [
		ArbitrageOrchestrator,
		ExecutionPreparer,
		ArbitrageScheduler,
		MermaidVisualizer,
		{
			provide: GRAPH_VISUALIZER_TOKEN,
			useClass: MermaidVisualizer,
		},
	],
})
export class AppModule {}
