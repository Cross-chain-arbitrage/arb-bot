import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BalanceReporterModule } from './composition/balance-reporter/balance-reporter.module'
import { ArbitrageExecutorModule } from './composition/executor/arbitrage-executor.module'
import { ArbitrageFinderModule } from './composition/finder/arbitrage-finder.module'
import { GraphBuilderModule } from './composition/graph-builder/graph-builder.module'
import { loadConfig } from './configuration/configuration'
import { GRAPH_VISUALIZER_TOKEN } from './core/application/interfaces/graph-visualizer'
import { ArbitrageOrchestrator } from './core/application/use-cases/orchestration/arbitrage-orchestrator/arbitrage-orchestrator'
import { BotOrchestrator } from './core/application/use-cases/orchestration/bot-orchestrator/bot-orchestrator'
import { PriceOracleModule } from './core/infrastructure/price-oracle/price-oracle.module'
import { MermaidVisualizer } from './core/infrastructure/visualization/mermaid-visualizer'
import { ArbitrageScheduler } from './core/presentation/arbitrage-scheduler/arbitrage-scheduler'

@Module({
	imports: [
		GraphBuilderModule,
		ArbitrageFinderModule,
		ArbitrageExecutorModule,
		PriceOracleModule,
		BalanceReporterModule,
		ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
	],
	providers: [
		ArbitrageOrchestrator,
		ArbitrageScheduler,
		BotOrchestrator,
		{
			provide: GRAPH_VISUALIZER_TOKEN,
			useClass: MermaidVisualizer,
		},
	],
})
export class BotAppModule {}
