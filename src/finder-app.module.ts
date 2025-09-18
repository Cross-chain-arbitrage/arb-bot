import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GraphBuilderModule } from './composition/builder/graph-builder.module'
import { ArbitrageFinderModule } from './composition/finder/arbitrage-finder.module'
import { pinoLogger } from './composition/logging/pino-logger'
import { loadConfig } from './configuration/configuration'
import { GRAPH_VISUALIZER_TOKEN } from './core/application/interfaces/graph-visualizer'
import { BotOrchestrator } from './core/application/use-cases/orchestration/bot-orchestrator/bot-orchestrator'
import { PriceOracleModule } from './core/infrastructure/price-oracle/price-oracle.module'
import { MermaidVisualizer } from './core/infrastructure/visualization/mermaid-visualizer'
import { FinderScheduler } from './core/presentation/finder-scheduler/finder-scheduler'

@Module({
	imports: [
		pinoLogger,
		GraphBuilderModule,
		ArbitrageFinderModule,
		PriceOracleModule,
		ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
	],
	providers: [
		FinderScheduler,
		BotOrchestrator,
		{
			provide: GRAPH_VISUALIZER_TOKEN,
			useClass: MermaidVisualizer,
		},
	],
})
export class FinderAppModule {}
