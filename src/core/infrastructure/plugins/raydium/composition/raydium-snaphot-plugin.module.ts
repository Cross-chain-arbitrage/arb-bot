import { Module } from '@nestjs/common'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaUtilsModule } from '../../shared-utils/chain-specific/solana/solana-utils.module'
import { InterpolationHelper } from '../../shared-utils/interpolation-helper'
import { PriceOracleHelper } from '../../shared-utils/price-oracle-helper'
import { RaydiumSnapshotPlugin } from '../raydium-snapshot-plugin'

@Module({
	imports: [RaydiumModule, SolanaModule, SolanaUtilsModule],
	providers: [RaydiumSnapshotPlugin, PriceOracleHelper, InterpolationHelper],
	exports: [RaydiumSnapshotPlugin],
})
export class RaydiumSnapshotPluginModule {}
