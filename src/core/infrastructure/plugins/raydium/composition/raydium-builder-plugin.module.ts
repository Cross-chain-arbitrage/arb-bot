import { Module } from '@nestjs/common'
import { SolanaModule } from '../../../solana/solana.module'
import { RaydiumGraphPlugin } from '../raydium-graph-plugin'

@Module({
	imports: [SolanaModule],
	providers: [RaydiumGraphPlugin],
	exports: [RaydiumGraphPlugin],
})
export class RaydiumGraphPluginModule {}
