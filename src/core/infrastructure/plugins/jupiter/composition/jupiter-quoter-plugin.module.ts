import { Module } from '@nestjs/common'
import { JupiterModule } from '../../../jupiter/jupiter.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared/helpers/chain-specific/solana/solana-helper.module'
import { JupiterQuoterPlugin } from '../jupiter-quoter-plugin'

@Module({
	imports: [JupiterModule, SolanaModule, SolanaHelperModule],
	providers: [JupiterQuoterPlugin],
	exports: [JupiterQuoterPlugin],
})
export class JupiterQuoterPluginModule {}
