import { DexExecutorPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-executor-plugin.module'
import { DexExecutorPlugin } from '../../core/infrastructure/plugins/dex/dex-executor-plugin'
import { RaydiumExecutorPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-executor-plugin.module'
import { RaydiumExecutorPlugin } from '../../core/infrastructure/plugins/raydium/raydium-executor-plugin'

export const executorPluginModules = [
	RaydiumExecutorPluginModule,
	DexExecutorPluginModule,
]
export const executorPlugins = [RaydiumExecutorPlugin, DexExecutorPlugin]
