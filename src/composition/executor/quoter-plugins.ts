import { DexQuoterPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-quoter-plugin.module'
import { DexQuoterPlugin } from '../../core/infrastructure/plugins/dex/dex-quoter-plugin'
import { FuseBridgeQuoterPluginModule } from '../../core/infrastructure/plugins/fuse-bridge/composition/fuse-bridge-quoter-plugin.module'
import { FuseBridgeQuoterPlugin } from '../../core/infrastructure/plugins/fuse-bridge/fuse-bridge-quoter-plugin'
import { NativeWrapperQuoterPluginModule } from '../../core/infrastructure/plugins/native-wrapper/composition/native-wrapper-quoter-plugin.module'
import { NativeWrapperQuoterPlugin } from '../../core/infrastructure/plugins/native-wrapper/native-wrapper-quoter-plugin'
import { RelayQuoterPluginModule } from '../../core/infrastructure/plugins/relay/composition/relay-quoter-plugin.module'
import { RelayQuoterPlugin } from '../../core/infrastructure/plugins/relay/relay-quoter-plugin'
import { SimpleStargateQuoterPluginModule } from '../../core/infrastructure/plugins/simple-stargate/composition/simple-stargate-quoter-plugin.module'
import { SimpleStargateQuoterPlugin } from '../../core/infrastructure/plugins/simple-stargate/simple-stargate-quoter-plugin'
import { StargateQuoterPluginModule } from '../../core/infrastructure/plugins/stargate/composition/stargate-quoter-plugin.module'
import { StargateQuoterPlugin } from '../../core/infrastructure/plugins/stargate/stargate-quoter-plugin'

export const quoterPluginModules = [
	DexQuoterPluginModule,
	StargateQuoterPluginModule,
	NativeWrapperQuoterPluginModule,
	RelayQuoterPluginModule,
	SimpleStargateQuoterPluginModule,
	FuseBridgeQuoterPluginModule,
]

export const quoterPlugins = [
	DexQuoterPlugin,
	StargateQuoterPlugin,
	NativeWrapperQuoterPlugin,
	RelayQuoterPlugin,
	SimpleStargateQuoterPlugin,
	FuseBridgeQuoterPlugin,
]
