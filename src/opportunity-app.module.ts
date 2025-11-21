import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { GraphBuilderModule } from './composition/builder/graph-builder.module'
import {
	quoterPluginModules,
	quoterPlugins,
} from './composition/executor/quoter-plugins'
import { loadConfig } from './configuration/opportunity-finder-configuration'
import { TypedEventEmitterModule } from './core/application/events/typed-event-emmiter2'
import { EDGE_QUOTER_REGISTRY_TOKEN } from './core/application/interfaces/edge-quoter'
import { QuoterPlugin } from './core/application/interfaces/graph-plugin'
import { AllCyclesQuoter } from './core/application/use-cases/finding/all-cycles-quoter/all-cycles-quoter'
import { AllCyclesQuoterTelemetry } from './core/application/use-cases/finding/all-cycles-quoter/all-cycles-quoter-telemetry'
import { OpportunityReporter } from './core/application/use-cases/finding/opportunity-reporter/opportunity-reporter'
import { QuotedCycleAnalyzer } from './core/application/use-cases/finding/quoted-cycle-analyzer/quoted-cycle-analyzer'
import { GraphBuilder } from './core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from './core/application/use-cases/graph-builder/graph-token'
import { PathQuoter } from './core/application/use-cases/path-quoter/path-quoter'
import { Graph } from './core/domain/entities/graph'
import { PriceOracleModule } from './core/infrastructure/price-oracle/price-oracle.module'
import { TgOpportunityNotifierModule } from './core/infrastructure/tg-notifier/tg-opportunity-notifier/tg-opportunity-notifier.module'

@Module({
	imports: [
		GraphBuilderModule,
		PriceOracleModule,
		ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
		TypedEventEmitterModule,
		TgOpportunityNotifierModule,
		ScheduleModule.forRoot(),
		...quoterPluginModules,
	],
	providers: [
		AllCyclesQuoter,
		QuotedCycleAnalyzer,
		OpportunityReporter,
		PathQuoter,
		AllCyclesQuoterTelemetry,
		{
			provide: EDGE_QUOTER_REGISTRY_TOKEN,
			inject: [GraphBuilder, GRAPH_TOKEN, ...quoterPlugins],
			useFactory: (
				graphBuilder: GraphBuilder,
				graph: Graph,
				...quoterPlugins: QuoterPlugin[]
			) => {
				return graphBuilder.buildQuoterRegistry(graph, quoterPlugins)
			},
		},
	],
})
export class OpportunityAppModule {}
