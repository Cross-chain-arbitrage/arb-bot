import { Module } from '@nestjs/common'
import { EvmModule } from '../../../evm/evm.module'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { StargateQuoterPlugin } from '../stargate-quoter-plugin'

@Module({
	imports: [StargateModule, EvmModule],
	providers: [StargateQuoterPlugin],
	exports: [StargateQuoterPlugin],
})
export class StargateQuoterPluginModule {}
