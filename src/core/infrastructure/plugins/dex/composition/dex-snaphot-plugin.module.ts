import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmHelperModule } from '../../shared/helpers/chain-specific/evm/evm-helper.module'
import { InterpolationModule } from '../../shared/helpers/interpolation/interpolation.module'
import { DexSnapshotPlugin } from '../dex-snapshot-plugin'

@Module({
	imports: [EvmModule, DexModule, EvmHelperModule, InterpolationModule],
	providers: [DexSnapshotPlugin],
	exports: [DexSnapshotPlugin],
})
export class DexSnapshotPluginModule {}
