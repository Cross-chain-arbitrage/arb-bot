import { Injectable, Module } from '@nestjs/common'
import { DexRegistry } from '../../../dex/dex-registry'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { DexGraphPlugin } from '../dex-graph-plugin'
import { EdgeToPoolRegistryModule } from '../edge-to-pool-registry'

export const dexGraphPlugins = Object.keys(DexRegistry).map((dexName) => {
	@Injectable()
	class DexGraphPluginWithOverriddenId extends DexGraphPlugin {
		override overriddenId = dexName
	}

	Object.defineProperty(DexGraphPluginWithOverriddenId, 'name', {
		value: dexName + 'GraphPlugin',
	})

	return DexGraphPluginWithOverriddenId
})

@Module({
	imports: [EvmModule, DexModule, EdgeToPoolRegistryModule],
	providers: [...dexGraphPlugins],
	exports: [...dexGraphPlugins],
})
export class DexGraphPluginModule {}
