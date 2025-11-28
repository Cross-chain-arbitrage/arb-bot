import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PATH_FINDER_TOKEN } from '../../core/application/interfaces/path-finder'
import { ARBITRAGE_FINDER_CONFIG_KEY } from '../../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import { ArbitrageFinderConfig } from '../../core/application/use-cases/finding/arbitrage-finder/types'
import { GraphSnapshotBuilder } from '../../core/application/use-cases/finding/graph-snapshot-builder/gpaph-snapshot-builder'
import { QuotePathFinder } from '../../core/application/use-cases/finding/quote-path-finder/quote-path-finder'
import { SnapshotPathFinder } from '../../core/application/use-cases/finding/snapshot-path-finder/snapshot-path-finder'
import { PathQuoter } from '../../core/application/use-cases/path-quoter/path-quoter'
import { QuotersRegistryModule } from '../quoters-registry/quoters-registry.module'
import { SnapshotBuildersRegistryModule } from '../snapshot-builders-registry/snapshot-builders-registry.module'

@Module({
	imports: [QuotersRegistryModule, SnapshotBuildersRegistryModule],
	providers: [
		PathQuoter,
		GraphSnapshotBuilder,
		{
			provide: PATH_FINDER_TOKEN,
			inject: [ConfigService, PathQuoter, GraphSnapshotBuilder],
			useFactory: (
				configService: ConfigService,
				pathQuoter: PathQuoter,
				graphSnapshotBuilder: GraphSnapshotBuilder,
			) => {
				const config = configService.get<ArbitrageFinderConfig>(
					ARBITRAGE_FINDER_CONFIG_KEY,
				)

				if (!config) {
					throw new Error('Arbitrage finder config not found')
				}

				switch (config.pathFinder.type) {
					case 'quote':
						return new QuotePathFinder(pathQuoter)

					case 'snapshot':
						return new SnapshotPathFinder(graphSnapshotBuilder)
				}
			},
		},
	],
	exports: [PATH_FINDER_TOKEN],
})
export class PathFinderModule {}
