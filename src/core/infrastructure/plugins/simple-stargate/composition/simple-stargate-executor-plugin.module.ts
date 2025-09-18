import { Module } from '@nestjs/common'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { SolanaEvmHelperModule } from '../../shared-helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { SimpleStargateExecutorPlugin } from '../simple-stargate-executor-plugin'

@Module({
	imports: [SolanaEvmHelperModule, StargateModule],
	providers: [SimpleStargateExecutorPlugin],
	exports: [SimpleStargateExecutorPlugin],
})
export class SimpleStargateExecutorPluginModule {}
