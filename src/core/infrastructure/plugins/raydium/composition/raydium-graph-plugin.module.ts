import { Module } from '@nestjs/common'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared-helpers/chain-specific/solana/solana-helper.module'
import { RaydiumGraphPlugin } from '../raydium-graph-plugin'

@Module({
	imports: [SolanaModule, SolanaHelperModule],
	providers: [RaydiumGraphPlugin],
	exports: [RaydiumGraphPlugin],
})
export class RaydiumGraphPluginModule {}
