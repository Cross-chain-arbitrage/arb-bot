import { Module } from '@nestjs/common'
import { SNAPSHOT_BUILDERS_REGISTRY_TOKEN } from '../../core/application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../core/application/interfaces/graph-plugin'
import { GraphBuilder } from '../../core/application/use-cases/graph-builder/graph-builder'
import { GRAPH_TOKEN } from '../../core/application/use-cases/graph-builder/graph-token'
import { Graph } from '../../core/domain/entities/graph'
import { GraphBuilderModule } from '../graph-builder/graph-builder.module'
import { snapshotPluginModules, snapshotPlugins } from './snapshot-plugins'

@Module({
	imports: [GraphBuilderModule, ...snapshotPluginModules],
	providers: [
		{
			provide: SNAPSHOT_BUILDERS_REGISTRY_TOKEN,
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
	exports: [SNAPSHOT_BUILDERS_REGISTRY_TOKEN],
})
export class SnapshotBuildersRegistryModule {}
