import { Module } from '@nestjs/common'
import { loadConfig } from '../../configuration/configuration'
import { EDGE_QUOTER_REGISTRY_TOKEN } from '../../core/application/interfaces/edge-quoter'
import { EDGE_SNAPSHOT_BUILDER_REGISTRY_TOKEN } from '../../core/application/interfaces/edge-snapshot-builder'
import {
	QuoterPlugin,
	SnapshotPlugin,
} from '../../core/application/interfaces/graph-plugin'
import { PATH_FINDER_TOKEN } from '../../core/application/interfaces/path-finder'
import { ArbitrageFinder } from '../../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import { GraphSnapshotBuilder } from '../../core/application/use-cases/finding/graph-snapshot-builder/gpaph-snapshot-builder'
import { OpportunityFinder } from '../../core/application/use-cases/finding/opportunity-finder.ts/opportunity-finder'
import { OpportunityReporter } from '../../core/application/use-cases/finding/opportunity-reporter/opportunity-reporter'
import { OpportunityValidator } from '../../core/application/use-cases/finding/opportunity-validator/opportunity-validator'
import { QuotePathFinder } from '../../core/application/use-cases/finding/quote-path-finder/quote-path-finder'
import { SnapshotOpportunityFinder } from '../../core/application/use-cases/finding/snapshot-opportunity-finder/snapshot-opportunity-finder'
import { SnapshotPathFinder } from '../../core/application/use-cases/finding/snapshot-path-finder/snapshot-path-finder'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { PathQuoter } from '../../core/application/use-cases/path-quoter/path-quoter'
import { Graph } from '../../core/domain/entities/graph'
import { GraphBuilderModule } from '../builder/graph-builder.module'
import { quoterPluginModules, quoterPlugins } from '../executor/quoter-plugins'
import { snapshotPluginModules, snapshotPlugins } from './snapshot-plugins'

const config = loadConfig()

@Module({
	imports: [
		GraphBuilderModule,
		...snapshotPluginModules,
		...quoterPluginModules,
	],
	providers: [
		ArbitrageFinder,
		OpportunityFinder,
		OpportunityValidator,
		SnapshotOpportunityFinder,
		GraphSnapshotBuilder,
		OpportunityReporter,
		PathQuoter,
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
		{
			provide: EDGE_SNAPSHOT_BUILDER_REGISTRY_TOKEN,
			inject: [GraphBuilder, GRAPH_TOKEN, ...snapshotPlugins],
			useFactory: (
				graphBuilder: GraphBuilder,
				graph: Graph,
				...snapshotPlugins: SnapshotPlugin[]
			) => {
				return graphBuilder.buildSnapshotBuilderRegistry(
					graph,
					snapshotPlugins,
				)
			},
		},
		{
			provide: PATH_FINDER_TOKEN,
			useClass:
				config.pathFinder.type === 'quote'
					? QuotePathFinder
					: SnapshotPathFinder,
		},
	],
	exports: [
		ArbitrageFinder,
		GraphSnapshotBuilder,
		PATH_FINDER_TOKEN,
		EDGE_QUOTER_REGISTRY_TOKEN,
	],
})
export class ArbitrageFinderModule {}
