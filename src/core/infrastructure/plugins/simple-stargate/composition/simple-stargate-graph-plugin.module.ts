import { Module } from '@nestjs/common'
import { SolanaEvmHelperModule } from '../../shared/helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { SimpleStargateGraphPlugin } from '../simple-stargate-graph-plugin'

@Module({
	imports: [SolanaEvmHelperModule],
	providers: [SimpleStargateGraphPlugin],
	exports: [SimpleStargateGraphPlugin],
})
export class SimpleStargateGraphPluginModule {}
