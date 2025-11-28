import { DexSnapshotPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-snaphot-plugin.module'
import { DexSnapshotPlugin } from '../../core/infrastructure/plugins/dex/dex-snapshot-plugin'
import { FuseBridgeSnapshotPluginModule } from '../../core/infrastructure/plugins/fuse-bridge/composition/fuse-bridge-snaphot-plugin.module'
import { FuseBridgeSnapshotPlugin } from '../../core/infrastructure/plugins/fuse-bridge/fuse-bridge-snapshot-plugin'
import { JupiterSnapshotPluginModule } from '../../core/infrastructure/plugins/jupiter/composition/jupiter-snaphot-plugin.module'
import { JupiterSnapshotPlugin } from '../../core/infrastructure/plugins/jupiter/jupiter-snapshot-plugin'
import { LifiSnapshotPluginModule } from '../../core/infrastructure/plugins/lifi/composition/lifi-snaphot-plugin.module'
import { LifiSnapshotPlugin } from '../../core/infrastructure/plugins/lifi/lifi-snapshot-plugin'
import { MockSnapshotPluginModule } from '../../core/infrastructure/plugins/mock/composition/mock-snapshot-plugin.module'
import { MockSnapshotPlugin } from '../../core/infrastructure/plugins/mock/mock-snapshot-plugin'
import { NativeWrapperSnapshotPluginModule } from '../../core/infrastructure/plugins/native-wrapper/composition/native-wrapper-snaphot-plugin.module'
import { NativeWrapperSnapshotPlugin } from '../../core/infrastructure/plugins/native-wrapper/native-wrapper-snapshot-plugin'
import { OftSnapshotPluginModule } from '../../core/infrastructure/plugins/oft/composition/oft-snaphot-plugin.module'
import { OftSnapshotPlugin } from '../../core/infrastructure/plugins/oft/oft-snapshot-plugin'
import { RaydiumSnapshotPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-snaphot-plugin.module'
import { RaydiumSnapshotPlugin } from '../../core/infrastructure/plugins/raydium/raydium-snapshot-plugin'
import { RelaySnapshotPluginModule } from '../../core/infrastructure/plugins/relay/composition/relay-snaphot-plugin.module'
import { RelaySnapshotPlugin } from '../../core/infrastructure/plugins/relay/relay-snapshot-plugin'
import { SimpleStargateSnapshotPluginModule } from '../../core/infrastructure/plugins/simple-stargate/composition/simple-stargate-snaphot-plugin.module'
import { SimpleStargateSnapshotPlugin } from '../../core/infrastructure/plugins/simple-stargate/simple-stargate-snapshot-plugin'
import { StargateSnapshotPluginModule } from '../../core/infrastructure/plugins/stargate/composition/stargate-snaphot-plugin.module'
import { StargateSnapshotPlugin } from '../../core/infrastructure/plugins/stargate/stargate-snapshot-plugin'

export const snapshotPluginModules = [
	RaydiumSnapshotPluginModule,
	DexSnapshotPluginModule,
	NativeWrapperSnapshotPluginModule,
	StargateSnapshotPluginModule,
	RelaySnapshotPluginModule,
	SimpleStargateSnapshotPluginModule,
	FuseBridgeSnapshotPluginModule,
	JupiterSnapshotPluginModule,
	LifiSnapshotPluginModule,
	OftSnapshotPluginModule,
	MockSnapshotPluginModule,
]

export const snapshotPlugins = [
	RaydiumSnapshotPlugin,
	DexSnapshotPlugin,
	NativeWrapperSnapshotPlugin,
	StargateSnapshotPlugin,
	RelaySnapshotPlugin,
	SimpleStargateSnapshotPlugin,
	FuseBridgeSnapshotPlugin,
	JupiterSnapshotPlugin,
	LifiSnapshotPlugin,
	OftSnapshotPlugin,
	MockSnapshotPlugin,
]
