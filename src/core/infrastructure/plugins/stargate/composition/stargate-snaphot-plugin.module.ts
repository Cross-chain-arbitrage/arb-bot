import { Module } from '@nestjs/common'
import { EvmModule } from '../../../evm/evm.module'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { StargateSnapshotPlugin } from '../stargate-snapshot-plugin'

@Module({
	imports: [StargateModule, EvmModule],
	providers: [StargateSnapshotPlugin],
	exports: [StargateSnapshotPlugin],
})
export class StargateSnapshotPluginModule {}
