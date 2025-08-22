import { Injectable, Module } from '@nestjs/common'
import { DexRegistry } from '../../../dex/dex-registry'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmPluginHelper } from '../../helpers/evm-plugin-helper'
import { InterpolationHelper } from '../../helpers/interpolation-helper'
import { PriceOracleHelper } from '../../helpers/price-oracle-helper'
import { DexSnapshotPlugin } from '../dex-snapshot-plugin'
import { EdgeToPoolRegistryModule } from '../edge-to-pool-registry'

export const dexSnapshotPlugins = Object.keys(DexRegistry).map((dexName) => {
	@Injectable()
	class DexSnapshotPluginWithOverriddenId extends DexSnapshotPlugin {
		override overriddenId = dexName
	}

	Object.defineProperty(DexSnapshotPluginWithOverriddenId, 'name', {
		value: dexName + 'SnapshotPlugin',
	})

	return DexSnapshotPluginWithOverriddenId
})

@Module({
	imports: [EvmModule, DexModule, EdgeToPoolRegistryModule],
	providers: [
		EvmPluginHelper,
		PriceOracleHelper,
		InterpolationHelper,
		...dexSnapshotPlugins,
	],
	exports: [...dexSnapshotPlugins],
})
export class DexSnapshotPluginModule {}
