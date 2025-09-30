import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { EvmModule } from '../../../evm/evm.module'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { EvmHelperModule } from '../../shared-helpers/chain-specific/evm/evm-helper.module'
import { StargateQuoterPlugin } from '../stargate-quoter-plugin'

@Module({
	imports: [TokenValuatorModule, StargateModule, EvmModule, EvmHelperModule],
	providers: [StargateQuoterPlugin],
	exports: [StargateQuoterPlugin],
})
export class StargateQuoterPluginModule {}
