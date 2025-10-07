import { DexExecutorPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-executor-plugin.module'
import { DexExecutorPlugin } from '../../core/infrastructure/plugins/dex/dex-executor-plugin'
import { FuseBridgeExecutorPluginModule } from '../../core/infrastructure/plugins/fuse-bridge/composition/fuse-bridge-executor-plugin.module'
import { FuseBridgeExecutorPlugin } from '../../core/infrastructure/plugins/fuse-bridge/fuse-bridge-executor-plugin'
import { JupiterExecutorPluginModule } from '../../core/infrastructure/plugins/jupiter/composition/jupiter-executor-plugin.module'
import { JupiterExecutorPlugin } from '../../core/infrastructure/plugins/jupiter/jupiter-executor-plugin'
import { LifiExecutorPluginModule } from '../../core/infrastructure/plugins/lifi/composition/lifi-executor-plugin.module'
import { LifiExecutorPlugin } from '../../core/infrastructure/plugins/lifi/lifi-executor-plugin'
import { NativeWrapperExecutorPluginModule } from '../../core/infrastructure/plugins/native-wrapper/composition/native-wrapper-executor-plugin.module'
import { NativeWrapperExecutorPlugin } from '../../core/infrastructure/plugins/native-wrapper/native-wrapper-executor-plugin'
import { OftExecutorPluginModule } from '../../core/infrastructure/plugins/oft/composition/oft-executor-plugin.module'
import { OftExecutorPlugin } from '../../core/infrastructure/plugins/oft/oft-executor-plugin'
import { RaydiumExecutorPluginModule } from '../../core/infrastructure/plugins/raydium/composition/raydium-executor-plugin.module'
import { RaydiumExecutorPlugin } from '../../core/infrastructure/plugins/raydium/raydium-executor-plugin'
import { RelayExecutorPluginModule } from '../../core/infrastructure/plugins/relay/composition/relay-executor-plugin.module'
import { RelayExecutorPlugin } from '../../core/infrastructure/plugins/relay/relay-executor-plugin'
import { SimpleStargateExecutorPluginModule } from '../../core/infrastructure/plugins/simple-stargate/composition/simple-stargate-executor-plugin.module'
import { SimpleStargateExecutorPlugin } from '../../core/infrastructure/plugins/simple-stargate/simple-stargate-executor-plugin'
import { StargateExecutorPluginModule } from '../../core/infrastructure/plugins/stargate/composition/stargate-executor-plugin.module'
import { StargateExecutorPlugin } from '../../core/infrastructure/plugins/stargate/stargate-executor-plugin'

export const executorPluginModules = [
	RelayExecutorPluginModule,
	RaydiumExecutorPluginModule,
	DexExecutorPluginModule,
	StargateExecutorPluginModule,
	NativeWrapperExecutorPluginModule,
	SimpleStargateExecutorPluginModule,
	FuseBridgeExecutorPluginModule,
	JupiterExecutorPluginModule,
	LifiExecutorPluginModule,
	OftExecutorPluginModule,
]

export const executorPlugins = [
	RelayExecutorPlugin,
	RaydiumExecutorPlugin,
	DexExecutorPlugin,
	StargateExecutorPlugin,
	NativeWrapperExecutorPlugin,
	SimpleStargateExecutorPlugin,
	FuseBridgeExecutorPlugin,
	JupiterExecutorPlugin,
	LifiExecutorPlugin,
	OftExecutorPlugin,
]
