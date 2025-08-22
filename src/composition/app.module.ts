import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { loadConfig } from '../configuration/configuration'
import { GRAPH_VISUALIZER_TOKEN } from '../core/application/interfaces/graph-visualizer'
import { ArbitrageOrchestrator } from '../core/application/use-cases/arbitrage-orchestrator/arbitrage-orchestrator'
import { PriceOracleModule } from '../core/infrastructure/price-oracle/price-oracle.module'
import { MermaidVisualizer } from '../core/infrastructure/visualization/mermaid-visualizer'
import { ArbitrageScheduler } from '../core/presentation/arbitrage-scheduler/arbitrage-scheduler'
import { GraphBuilderModule } from './builder/graph-builder.module'
import { ArbitrageExecutorModule } from './executor/arbitrage-executor.module'
import { ArbitrageFinderModule } from './finder/arbitrage-finder.module'

@Module({
	imports: [
		GraphBuilderModule,
		ArbitrageFinderModule,
		ArbitrageExecutorModule,
		PriceOracleModule,
		ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
		ScheduleModule.forRoot(),
	],
	providers: [
		ArbitrageOrchestrator,
		ArbitrageScheduler,
		MermaidVisualizer,
		{
			provide: GRAPH_VISUALIZER_TOKEN,
			useClass: MermaidVisualizer,
		},
	],
})
export class AppModule {}

async function main() {
	const app = await NestFactory.createApplicationContext(AppModule)
}

void main()
