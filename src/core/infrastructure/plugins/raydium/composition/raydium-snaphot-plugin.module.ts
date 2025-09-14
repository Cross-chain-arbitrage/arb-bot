import { Module } from '@nestjs/common'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared-helpers/chain-specific/solana/solana-helper.module'
import { InterpolationHelper } from '../../shared-helpers/interpolation-helper'
import { PriceOracleHelper } from '../../shared-helpers/price-oracle-helper'
import { RaydiumSnapshotPlugin } from '../raydium-snapshot-plugin'

@Module({
	imports: [RaydiumModule, SolanaModule, SolanaHelperModule],
	providers: [RaydiumSnapshotPlugin, PriceOracleHelper, InterpolationHelper],
	exports: [RaydiumSnapshotPlugin],
})
export class RaydiumSnapshotPluginModule {}
