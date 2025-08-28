import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmUtilsModule } from '../../shared-utils/chain-specific/evm/evm-utils.module'
import { InterpolationHelper } from '../../shared-utils/interpolation-helper'
import { PriceOracleHelper } from '../../shared-utils/price-oracle-helper'
import { DexSnapshotPlugin } from '../dex-snapshot-plugin'

@Module({
	imports: [EvmModule, DexModule, EvmUtilsModule],
	providers: [PriceOracleHelper, InterpolationHelper, DexSnapshotPlugin],
	exports: [DexSnapshotPlugin],
})
export class DexSnapshotPluginModule {}
