import z from 'zod'
import { DexGraphConfigSchema } from '../core/infrastructure/plugins/dex/configuration/dex-config'
import { DEX_CONFIG_KEY } from '../core/infrastructure/plugins/dex/constants'
import { JupiterGraphConfigSchema } from '../core/infrastructure/plugins/jupiter/configuration/jupiter-config'
import { JUPITER_CONFIG_KEY } from '../core/infrastructure/plugins/jupiter/constants'
import { LifiGraphConfigSchema } from '../core/infrastructure/plugins/lifi/configuration/lifi-config'
import { LIFI_CONFIG_KEY } from '../core/infrastructure/plugins/lifi/constants'
import { MockGraphConfigSchema } from '../core/infrastructure/plugins/mock/configuration/mock-config'
import { MOCK_CONFIG_KEY } from '../core/infrastructure/plugins/mock/constants'
import { NativeWrapperGraphConfigSchema } from '../core/infrastructure/plugins/native-wrapper/configuration/native-wrapper-config'
import { NATIVE_WRAPPER_CONFIG_KEY } from '../core/infrastructure/plugins/native-wrapper/constants'
import { OftGraphConfigSchema } from '../core/infrastructure/plugins/oft/configuration/oft-config'
import { OFT_CONFIG_KEY } from '../core/infrastructure/plugins/oft/constants'
import { RaydiumGraphConfigSchema } from '../core/infrastructure/plugins/raydium/configuration/raydium-config'
import { RAYDIUM_CONFIG_KEY } from '../core/infrastructure/plugins/raydium/constants'
import { RelayGraphConfigSchema } from '../core/infrastructure/plugins/relay/configuration/relay-config'
import { RELAY_CONFIG_KEY } from '../core/infrastructure/plugins/relay/constants'
import { SimpleStargateGraphConfigSchema } from '../core/infrastructure/plugins/simple-stargate/configuration/simple-stargate-config'
import { SIMPLE_STARGATE_CONFIG_KEY } from '../core/infrastructure/plugins/simple-stargate/constants'
import { StargateGraphConfigSchema } from '../core/infrastructure/plugins/stargate/configuration/stargate-config'
import { STARGATE_CONFIG_KEY } from '../core/infrastructure/plugins/stargate/constants'

export const GraphPluginsConfigSchema = z.object({
	[DEX_CONFIG_KEY]: DexGraphConfigSchema.optional(),
	[JUPITER_CONFIG_KEY]: JupiterGraphConfigSchema.optional(),
	[LIFI_CONFIG_KEY]: LifiGraphConfigSchema.optional(),
	[MOCK_CONFIG_KEY]: MockGraphConfigSchema.optional(),
	[NATIVE_WRAPPER_CONFIG_KEY]: NativeWrapperGraphConfigSchema.optional(),
	[OFT_CONFIG_KEY]: OftGraphConfigSchema.optional(),
	[RAYDIUM_CONFIG_KEY]: RaydiumGraphConfigSchema.optional(),
	[RELAY_CONFIG_KEY]: RelayGraphConfigSchema.optional(),
	[SIMPLE_STARGATE_CONFIG_KEY]: SimpleStargateGraphConfigSchema.optional(),
	[STARGATE_CONFIG_KEY]: StargateGraphConfigSchema.optional(),
})
