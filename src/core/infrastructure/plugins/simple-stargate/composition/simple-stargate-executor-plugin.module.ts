import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaEvmHelperModule } from '../../shared-helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { SimpleStargateExecutorPlugin } from '../simple-stargate-executor-plugin'

@Module({
	imports: [
		TokenValuatorModule,
		SolanaEvmHelperModule,
		StargateModule,
		SolanaModule,
	],
	providers: [SimpleStargateExecutorPlugin],
	exports: [SimpleStargateExecutorPlugin],
})
export class SimpleStargateExecutorPluginModule {}
