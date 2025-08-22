import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmPluginHelper } from '../../helpers/evm-plugin-helper'
import { InterpolationHelper } from '../../helpers/interpolation-helper'
import { PriceOracleHelper } from '../../helpers/price-oracle-helper'
import { DexSnapshotPlugin } from '../dex-snapshot-plugin'
import { EdgeToPoolRegistryModule } from '../edge-to-pool-registry'
@Module({
	imports: [EvmModule, DexModule, EdgeToPoolRegistryModule],
	providers: [
		DexSnapshotPlugin,
		EvmPluginHelper,
		PriceOracleHelper,
		InterpolationHelper,
	],
	exports: [DexSnapshotPlugin],
})
export class DexSnapshotPluginModule {}
