import { Module } from '@nestjs/common'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaUtilsModule } from '../../shared-utils/chain-specific/solana/solana-utils.module'
import { RaydiumGraphPlugin } from '../raydium-graph-plugin'

@Module({
	imports: [SolanaModule, SolanaUtilsModule],
	providers: [RaydiumGraphPlugin],
	exports: [RaydiumGraphPlugin],
})
export class RaydiumGraphPluginModule {}
