import { DexGraphPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-graph-plugin.module'
import { DexGraphPlugin } from '../../core/infrastructure/plugins/dex/dex-graph-plugin'
import { FuseBridgeGraphPluginModule } from '../../core/infrastructure/plugins/fuse-bridge/composition/fuse-bridge-graph-plugin.module'
import { FuseBridgeGraphPlugin } from '../../core/infrastructure/plugins/fuse-bridge/fuse-bridge-graph-plugin'
import { NativeWrapperGraphPluginModule } from '../../core/infrastructure/plugins/native-wrapper/composition/native-wrapper-graph-plugin.module'
import { NativeWrapperGraphPlugin } from '../../core/infrastructure/plugins/native-wrapper/native-wrapper-graph-plugin'
import { RaydiumGraphPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-builder-plugin.module'
import { RaydiumGraphPlugin } from '../../core/infrastructure/plugins/raydium/raydium-graph-plugin'
import { RelayGraphPluginModule } from '../../core/infrastructure/plugins/relay/composition/relay-graph-plugin.module'
import { RelayGraphPlugin } from '../../core/infrastructure/plugins/relay/relay-graph-plugin'
import { SimpleStargateGraphPluginModule } from '../../core/infrastructure/plugins/simple-stargate/composition/simple-stargate-graph-plugin.module'
import { SimpleStargateGraphPlugin } from '../../core/infrastructure/plugins/simple-stargate/simple-stargate-graph-plugin'
import { StargateGraphPluginModule } from '../../core/infrastructure/plugins/stargate/composition/stargate-graph-plugin.module'
import { StargateGraphPlugin } from '../../core/infrastructure/plugins/stargate/stargate-graph-plugin'

export const graphPluginModules = [
	RaydiumGraphPluginModule,
	DexGraphPluginModule,
	NativeWrapperGraphPluginModule,
	StargateGraphPluginModule,
	RelayGraphPluginModule,
	SimpleStargateGraphPluginModule,
	FuseBridgeGraphPluginModule,
]

export const graphPlugins = [
	RaydiumGraphPlugin,
	DexGraphPlugin,
	NativeWrapperGraphPlugin,
	StargateGraphPlugin,
	RelayGraphPlugin,
	SimpleStargateGraphPlugin,
	FuseBridgeGraphPlugin,
]
