import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { RaydiumService } from '../../../raydium/raydium.service'
import { SolanaModule } from '../../../solana/solana.module'
import { InterpolationHelper } from '../../helpers/interpolation-helper'
import { PriceOracleHelper } from '../../helpers/price-oracle-helper'
import { SolanaPluginHelper } from '../../helpers/solana-plugin-helper'
import { RaydiumSnapshotPlugin } from '../raydium-snapshot-plugin'

@Module({
	imports: [CacheModule.register(), SolanaModule],
	providers: [
		RaydiumSnapshotPlugin,
		RaydiumService,
		SolanaPluginHelper,
		PriceOracleHelper,
		InterpolationHelper,
	],
	exports: [RaydiumSnapshotPlugin],
})
export class RaydiumSnapshotPluginModule {}
