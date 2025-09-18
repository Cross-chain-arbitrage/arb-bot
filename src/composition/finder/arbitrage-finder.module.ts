import { Module } from '@nestjs/common'
import { EDGE_SNAPSHOT_BUILDER_REGISTRY_TOKEN } from '../../core/application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../core/application/interfaces/graph-plugin'
import { ArbitrageFinder } from '../../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import { GraphSnapshotBuilder } from '../../core/application/use-cases/finding/graph-snapshot-builder/gpaph-snapshot-builder'
import { OpportunityFinder } from '../../core/application/use-cases/finding/opportunity-finder.ts/opportunity-finder'
import { OpportunityReporter } from '../../core/application/use-cases/finding/opportunity-reporter/opportunity-reporter'
import { OpportunityValidator } from '../../core/application/use-cases/finding/opportunity-validator/opportunity-validator'
import { SnapshotOpportunityFinder } from '../../core/application/use-cases/finding/snapshot-opportunity-finder/snapshot-opportunity-finder'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { Graph } from '../../core/domain/entities/graph'
import { GraphBuilderModule } from '../builder/graph-builder.module'
import { snapshotPluginModules, snapshotPlugins } from './snapshot-plugins'

@Module({
	imports: [GraphBuilderModule, ...snapshotPluginModules],
	providers: [
		ArbitrageFinder,
		OpportunityFinder,
		OpportunityValidator,
		SnapshotOpportunityFinder,
		GraphSnapshotBuilder,
		OpportunityReporter,
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
	],
	exports: [ArbitrageFinder],
})
export class ArbitrageFinderModule {}
