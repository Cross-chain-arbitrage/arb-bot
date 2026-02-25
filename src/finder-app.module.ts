import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { GraphBuilderModule } from './composition/graph-builder/graph-builder.module'
import { QuotersRegistryModule } from './composition/quoters-registry/quoters-registry.module'
import { loadConfig } from './configuration/configuration'
import { TypedEventEmitterModule } from './core/application/events/typed-event-emmiter2'
import { AllCyclesQuoter } from './core/application/use-cases/finding/all-cycles-quoter/all-cycles-quoter'
import { AllCyclesQuoterTelemetry } from './core/application/use-cases/finding/all-cycles-quoter/all-cycles-quoter-telemetry'
import { OpportunityReporter } from './core/application/use-cases/finding/opportunity-reporter/opportunity-reporter'
import { QuotedCycleAnalyzer } from './core/application/use-cases/finding/quoted-cycle-analyzer/quoted-cycle-analyzer'
import { GraphSaver } from './core/application/use-cases/orchestration/graph-saver/graph-saver'
import { PathQuoter } from './core/application/use-cases/path-quoter/path-quoter'
import { PriceOracleModule } from './core/infrastructure/price-oracle/price-oracle.module'
import { TgOpportunityNotifierModule } from './core/infrastructure/tg-notifier/tg-opportunity-notifier/tg-opportunity-notifier.module'
import { MermainVisualizerModule } from './core/infrastructure/visualization/mermaid-visualizer.module'

@Module({
	imports: [
		GraphBuilderModule,
		PriceOracleModule,
		ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
		TypedEventEmitterModule,
		TgOpportunityNotifierModule,
		ScheduleModule.forRoot(),
		QuotersRegistryModule,
		MermainVisualizerModule,
	],
	providers: [
		AllCyclesQuoter,
		AllCyclesQuoterTelemetry,

		QuotedCycleAnalyzer,
		OpportunityReporter,
		PathQuoter,

		GraphSaver,
	],
})
export class FinderAppModule {}
