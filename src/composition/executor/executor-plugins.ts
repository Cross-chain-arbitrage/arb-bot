import {
	DexExecutorPluginModule,
	dexExecutorPlugins,
} from '../../core/infrastructure/plugins/dex/composition/dex-executor-plugin.module'
import { RaydiumExecutorPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-executor-plugin.module'
import { RaydiumExecutorPlugin } from '../../core/infrastructure/plugins/raydium/raydium-executor-plugin'

export const executorPluginModules = [
	RaydiumExecutorPluginModule,
	DexExecutorPluginModule,
]
export const executorPlugins = [RaydiumExecutorPlugin, ...dexExecutorPlugins]
