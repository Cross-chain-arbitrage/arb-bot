import { DexGraphPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-builder-plugin.module'
import { DexGraphPlugin } from '../../core/infrastructure/plugins/dex/dex-graph-plugin'
import { RaydiumGraphPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-builder-plugin.module'
import { RaydiumGraphPlugin } from '../../core/infrastructure/plugins/raydium/raydium-graph-plugin'

export const graphPluginModules = [
	RaydiumGraphPluginModule,
	DexGraphPluginModule,
]
export const graphPlugins = [RaydiumGraphPlugin, DexGraphPlugin]
