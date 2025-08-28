import { DexSnapshotPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-snaphot-plugin.module'
import { DexSnapshotPlugin } from '../../core/infrastructure/plugins/dex/dex-snapshot-plugin'
import { RaydiumSnapshotPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-snaphot-plugin.module'
import { RaydiumSnapshotPlugin } from '../../core/infrastructure/plugins/raydium/raydium-snapshot-plugin'

export const snapshotPluginModules = [
	RaydiumSnapshotPluginModule,
	DexSnapshotPluginModule,
]
export const snapshotPlugins = [RaydiumSnapshotPlugin, DexSnapshotPlugin]
