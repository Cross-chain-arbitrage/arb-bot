import { Module } from '@nestjs/common'
import { EvmModule } from '../../../evm/evm.module'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { StargateExecutorPlugin } from '../stargate-executor-plugin'

@Module({
	imports: [StargateModule, EvmModule],
	providers: [StargateExecutorPlugin],
	exports: [StargateExecutorPlugin],
})
export class StargateExecutorPluginModule {}
