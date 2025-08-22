import { Module } from '@nestjs/common'
import { SnapshotPlugin } from '../../core/application/interfaces/graph-plugin'
import {
	ArbitrageFinder,
	GRAPH_TOKEN,
} from '../../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import {
	EDGE_SNAPSHOT_BUILDER_REGISTRY_TOKEN,
	GraphSnapshotBuilder,
} from '../../core/application/use-cases/finding/graph-snapshot-builder/gpaph-snapshot-builder'
import { OpportunityFinder } from '../../core/application/use-cases/finding/opportunity-finder.ts/opportunity-finder'
import { OpportunityReporter } from '../../core/application/use-cases/finding/opportunity-reporter/opportunity-reporter'
import { OpportunityValidator } from '../../core/application/use-cases/finding/opportunity-validator/opportunity-validator'
import { SnapshotOpportunityFinder } from '../../core/application/use-cases/finding/snapshot-opportunity-finder/snapshot-opportunity-finder'
import { GRAPH_WITH_EDGE_OWNERS_TOKEN } from '../../core/application/use-cases/graph-builder/di-tokens'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GraphWithEdgeOwners } from '../../core/application/use-cases/graph-builder/types'
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
			provide: GRAPH_TOKEN,
			inject: [GRAPH_WITH_EDGE_OWNERS_TOKEN],
			useFactory: (graphWithEdgeOwners: GraphWithEdgeOwners) =>
				graphWithEdgeOwners.graph,
		},
		{
			provide: EDGE_SNAPSHOT_BUILDER_REGISTRY_TOKEN,
			inject: [
				GraphBuilder,
				GRAPH_WITH_EDGE_OWNERS_TOKEN,
				...snapshotPlugins,
			],
			useFactory: (
				graphBuilder: GraphBuilder,
				graphWithEdgeOwners: GraphWithEdgeOwners,
				...snapshotPlugins: SnapshotPlugin[]
			) => {
				return graphBuilder.buildSnapshotBuilderRegistry(
					graphWithEdgeOwners.graph,
					snapshotPlugins,
					graphWithEdgeOwners.edgeOwners,
				)
			},
		},
	],
	exports: [ArbitrageFinder],
})
export class ArbitrageFinderModule {}
