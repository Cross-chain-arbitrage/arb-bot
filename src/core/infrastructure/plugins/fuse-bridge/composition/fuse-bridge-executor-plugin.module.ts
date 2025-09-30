import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { EvmModule } from '../../../evm/evm.module'
import { FuseBridgeModule } from '../../../layerzero-bridges/fuse-bridge/fuse-bridge.module'
import { EvmHelperModule } from '../../shared-helpers/chain-specific/evm/evm-helper.module'
import { FuseBridgeExecutorPlugin } from '../fuse-bridge-executor-plugin'

@Module({
	imports: [
		TokenValuatorModule,
		EvmModule,
		EvmHelperModule,
		FuseBridgeModule,
	],
	providers: [FuseBridgeExecutorPlugin],
	exports: [FuseBridgeExecutorPlugin],
})
export class FuseBridgeExecutorPluginModule {}
