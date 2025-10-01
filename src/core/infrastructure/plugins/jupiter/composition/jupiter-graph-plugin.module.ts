import { Module } from '@nestjs/common'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared-helpers/chain-specific/solana/solana-helper.module'
import { JupiterGraphPlugin } from '../jupiter-graph-plugin'

@Module({
	imports: [SolanaModule, SolanaHelperModule],
	providers: [JupiterGraphPlugin],
	exports: [JupiterGraphPlugin],
})
export class JupiterGraphPluginModule {}
