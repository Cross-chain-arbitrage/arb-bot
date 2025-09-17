import { DexQuoterPluginModule } from '../../core/infrastructure/plugins/dex/composition/dex-quoter-plugin.module'
import { DexQuoterPlugin } from '../../core/infrastructure/plugins/dex/dex-quoter-plugin'
import { NativeWrapperQuoterPluginModule } from '../../core/infrastructure/plugins/native-wrapper/composition/native-wrapper-quoter-plugin.module'
import { NativeWrapperQuoterPlugin } from '../../core/infrastructure/plugins/native-wrapper/native-wrapper-quoter-plugin'
import { RelayQuoterPluginModule } from '../../core/infrastructure/plugins/relay/composition/relay-quoter-plugin.module'
import { RelayQuoterPlugin } from '../../core/infrastructure/plugins/relay/relay-quoter-plugin'
import { StargateQuoterPluginModule } from '../../core/infrastructure/plugins/stargate/composition/stargate-quoter-plugin.module'
import { StargateQuoterPlugin } from '../../core/infrastructure/plugins/stargate/stargate-quoter-plugin'

export const quoterPluginModules = [
	DexQuoterPluginModule,
	StargateQuoterPluginModule,
	NativeWrapperQuoterPluginModule,
	RelayQuoterPluginModule,
]

export const quoterPlugins = [
	DexQuoterPlugin,
	StargateQuoterPlugin,
	NativeWrapperQuoterPlugin,
	RelayQuoterPlugin,
]
