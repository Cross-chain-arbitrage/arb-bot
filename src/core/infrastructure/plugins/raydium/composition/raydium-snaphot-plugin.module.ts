import { Module } from '@nestjs/common'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared-helpers/chain-specific/solana/solana-helper.module'
import { InterpolationModule } from '../../shared-helpers/interpolation/interpolation.module'
import { RaydiumSnapshotPlugin } from '../raydium-snapshot-plugin'

@Module({
	imports: [
		RaydiumModule,
		SolanaModule,
		SolanaHelperModule,
		InterpolationModule,
	],
	providers: [RaydiumSnapshotPlugin],
	exports: [RaydiumSnapshotPlugin],
})
export class RaydiumSnapshotPluginModule {}
