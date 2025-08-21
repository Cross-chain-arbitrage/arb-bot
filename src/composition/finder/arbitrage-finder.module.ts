import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
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
import { OpportunityValidator } from '../../core/application/use-cases/finding/opportunity-validator/opportunity-validator'
import { SnapshotOpportunityFinder } from '../../core/application/use-cases/finding/snapshot-opportunity-finder/snapshot-opportunity-finder'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GraphWithEdgeOwners } from '../../core/application/use-cases/graph-builder/types'
import { PriceOracleModule } from '../../core/infrastructure/price-oracle/price-oracle.module'
import {
	GRAPH_WITH_EDGE_OWNERS_TOKEN,
	GraphBuilderModule,
} from '../builder/graph-builder.module'
import { snapshotPluginModules, snapshotPlugins } from './snapshot-plugins'

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		PriceOracleModule,
		GraphBuilderModule,
		...snapshotPluginModules,
	],
	providers: [
		ArbitrageFinder,
		OpportunityFinder,
		OpportunityValidator,
		SnapshotOpportunityFinder,
		GraphSnapshotBuilder,
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
})
export class AppModule {}

async function main() {
	const app = await NestFactory.create(AppModule)
}
void main()
