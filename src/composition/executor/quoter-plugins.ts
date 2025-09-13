import { DexQuoterPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-quoter-plugin.module'
import { DexQuoterPlugin } from '../../core/infrastructure/plugins/dex/dex-quoter-plugin'

export const quoterPluginModules = [DexQuoterPluginModule]
export const quoterPlugins = [DexQuoterPlugin]
