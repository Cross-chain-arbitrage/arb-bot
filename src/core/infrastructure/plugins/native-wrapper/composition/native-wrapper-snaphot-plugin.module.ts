import { Module } from '@nestjs/common'
import { EvmHelperModule } from '../../shared/helpers/chain-specific/evm/evm-helper.module'
import { NativeWrapperSnapshotPlugin } from '../native-wrapper-snapshot-plugin'

@Module({
	imports: [EvmHelperModule],
	providers: [NativeWrapperSnapshotPlugin],
	exports: [NativeWrapperSnapshotPlugin],
})
export class NativeWrapperSnapshotPluginModule {}
