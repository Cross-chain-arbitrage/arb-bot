import { Module } from '@nestjs/common'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { InterpolationHelper } from '../../helpers/interpolation-helper'
import { PriceOracleHelper } from '../../helpers/price-oracle-helper'
import { SolanaPluginHelper } from '../../helpers/solana-plugin-helper'
import { RaydiumSnapshotPlugin } from '../raydium-snapshot-plugin'

@Module({
	imports: [RaydiumModule, SolanaModule],
	providers: [
		RaydiumSnapshotPlugin,
		SolanaPluginHelper,
		PriceOracleHelper,
		InterpolationHelper,
	],
	exports: [RaydiumSnapshotPlugin],
})
export class RaydiumSnapshotPluginModule {}
