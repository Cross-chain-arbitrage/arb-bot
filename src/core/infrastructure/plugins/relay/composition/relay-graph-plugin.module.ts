import { Module } from '@nestjs/common'
import { SolanaEvmHelperModule } from '../../shared-helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { RelayGraphPlugin } from '../relay-graph-plugin'

@Module({
	imports: [SolanaEvmHelperModule],
	providers: [RelayGraphPlugin],
	exports: [RelayGraphPlugin],
})
export class RelayGraphPluginModule {}
