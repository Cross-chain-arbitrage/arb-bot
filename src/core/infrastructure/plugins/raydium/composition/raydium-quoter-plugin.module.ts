import { Module } from '@nestjs/common'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared-helpers/chain-specific/solana/solana-helper.module'
import { RaydiumQuoterPlugin } from '../raydium-quoter-plugin'

@Module({
	imports: [RaydiumModule, SolanaModule, SolanaHelperModule],
	providers: [RaydiumQuoterPlugin],
	exports: [RaydiumQuoterPlugin],
})
export class RaydiumQuoterPluginModule {}
