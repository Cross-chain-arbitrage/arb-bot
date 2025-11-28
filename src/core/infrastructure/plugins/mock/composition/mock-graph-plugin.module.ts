import { Module } from '@nestjs/common'
import { SolanaEvmHelperModule } from '../../shared/helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { MockGraphPlugin } from '../mock-graph-plugin'

@Module({
	imports: [SolanaEvmHelperModule],
	providers: [MockGraphPlugin],
	exports: [MockGraphPlugin],
})
export class MockGraphPluginModule {}
