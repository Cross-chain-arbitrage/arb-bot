import { Injectable, Module } from '@nestjs/common'
import { DexRegistry } from '../../../dex/dex-registry'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmPluginHelper } from '../../helpers/evm-plugin-helper'
import { PriceOracleHelper } from '../../helpers/price-oracle-helper'
import { DexExecutorPlugin } from '../dex-executor-plugin'
import { EdgeToPoolRegistryModule } from '../edge-to-pool-registry'

export const dexExecutorPlugins = Object.keys(DexRegistry).map((dexName) => {
	@Injectable()
	class DexExecutorPluginWithOverriddenId extends DexExecutorPlugin {
		override overriddenId = dexName
	}

	Object.defineProperty(DexExecutorPluginWithOverriddenId, 'name', {
		value: dexName + 'ExecutorPlugin',
	})

	return DexExecutorPluginWithOverriddenId
})

@Module({
	imports: [EvmModule, DexModule, EdgeToPoolRegistryModule],
	providers: [...dexExecutorPlugins, EvmPluginHelper, PriceOracleHelper],
	exports: [...dexExecutorPlugins],
})
export class DexExecutorPluginModule {}
