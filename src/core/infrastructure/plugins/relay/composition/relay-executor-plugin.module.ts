import { Module } from '@nestjs/common'
import { RelayModule } from '../../../relay/relay.module'
import { SolanaEvmHelperModule } from '../../shared-helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { RelayExecutorPlugin } from '../relay-executor-plugin'

@Module({
	imports: [SolanaEvmHelperModule, RelayModule],
	providers: [RelayExecutorPlugin],
	exports: [RelayExecutorPlugin],
})
export class RelayExecutorPluginModule {}
