import {
	DexGraphPluginModule,
	dexGraphPlugins,
} from '../../core/infrastructure/plugins/dex/composition/dex-graph-plugin.module'
import { RaydiumGraphPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-builder-plugin.module'
import { RaydiumGraphPlugin } from '../../core/infrastructure/plugins/raydium/raydium-graph-plugin'

export const graphPluginModules = [
	RaydiumGraphPluginModule,
	DexGraphPluginModule,
]
export const graphPlugins = [RaydiumGraphPlugin, ...dexGraphPlugins]
