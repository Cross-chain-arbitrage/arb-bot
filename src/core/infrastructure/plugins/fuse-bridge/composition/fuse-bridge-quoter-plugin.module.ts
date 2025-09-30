import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { FuseBridgeModule } from '../../../layerzero-bridges/fuse-bridge/fuse-bridge.module'
import { EvmHelperModule } from '../../shared-helpers/chain-specific/evm/evm-helper.module'
import { FuseBridgeQuoterPlugin } from '../fuse-bridge-quoter-plugin'

@Module({
	imports: [TokenValuatorModule, EvmHelperModule, FuseBridgeModule],
	providers: [FuseBridgeQuoterPlugin],
	exports: [FuseBridgeQuoterPlugin],
})
export class FuseBridgeQuoterPluginModule {}
