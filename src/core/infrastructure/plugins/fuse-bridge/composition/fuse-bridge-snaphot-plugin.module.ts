import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { FuseBridgeModule } from '../../../layerzero-bridges/fuse-bridge/fuse-bridge.module'
import { EvmHelperModule } from '../../shared/helpers/chain-specific/evm/evm-helper.module'
import { FuseBridgeSnapshotPlugin } from '../fuse-bridge-snapshot-plugin'

@Module({
	imports: [TokenValuatorModule, EvmHelperModule, FuseBridgeModule],
	providers: [FuseBridgeSnapshotPlugin],
	exports: [FuseBridgeSnapshotPlugin],
})
export class FuseBridgeSnapshotPluginModule {}
