import { DexSnapshotPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-snaphot-plugin.module'
import { DexSnapshotPlugin } from '../../core/infrastructure/plugins/dex/dex-snapshot-plugin'
import { NativeWrapperSnapshotPluginModule } from '../../core/infrastructure/plugins/native-wrapper/composition/native-wrapper-snaphot-plugin.module'
import { NativeWrapperSnapshotPlugin } from '../../core/infrastructure/plugins/native-wrapper/native-wrapper-snapshot-plugin'
import { RaydiumSnapshotPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-snaphot-plugin.module'
import { RaydiumSnapshotPlugin } from '../../core/infrastructure/plugins/raydium/raydium-snapshot-plugin'
import { StargateSnapshotPluginModule } from '../../core/infrastructure/plugins/stargate/composition/stargate-snaphot-plugin.module'
import { StargateSnapshotPlugin } from '../../core/infrastructure/plugins/stargate/stargate-snapshot-plugin'

export const snapshotPluginModules = [
	RaydiumSnapshotPluginModule,
	DexSnapshotPluginModule,
	NativeWrapperSnapshotPluginModule,
	StargateSnapshotPluginModule,
]

export const snapshotPlugins = [
	RaydiumSnapshotPlugin,
	DexSnapshotPlugin,
	NativeWrapperSnapshotPlugin,
	StargateSnapshotPlugin,
]
