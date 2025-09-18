import { Module } from '@nestjs/common'
import { RelayModule } from '../../../relay/relay.module'
import { SolanaEvmHelperModule } from '../../shared-helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { RelayQuoterPlugin } from '../relay-quoter-plugin'

@Module({
	imports: [SolanaEvmHelperModule, RelayModule],
	providers: [RelayQuoterPlugin],
	exports: [RelayQuoterPlugin],
})
export class RelayQuoterPluginModule {}
