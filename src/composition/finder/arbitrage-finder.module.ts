import { Module } from '@nestjs/common'
import { ArbitrageFinder } from '../../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import { ArbitrageFinderTelemetry } from '../../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder-telemetry'
import { OpportunityFinder } from '../../core/application/use-cases/finding/opportunity-finder.ts/opportunity-finder'
import { OpportunityValidator } from '../../core/application/use-cases/finding/opportunity-validator/opportunity-validator'
import { GraphBuilderModule } from '../graph-builder/graph-builder.module'
import { PathFinderModule } from '../path-finder/path-finder.module'
import { QuotersRegistryModule } from '../quoters-registry/quoters-registry.module'
import { SnapshotBuildersRegistryModule } from '../snapshot-builders-registry/snapshot-builders-registry.module'

@Module({
	imports: [
		GraphBuilderModule,
		SnapshotBuildersRegistryModule,
		QuotersRegistryModule,
		PathFinderModule,
	],
	providers: [
		ArbitrageFinder,
		ArbitrageFinderTelemetry,

		OpportunityFinder,
		OpportunityValidator,
	],
	exports: [ArbitrageFinder],
})
export class ArbitrageFinderModule {}
