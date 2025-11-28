import z from 'zod'
import { DexSnapshotConfigSchema } from '../core/infrastructure/plugins/dex/configuration/dex-config'
import { DEX_CONFIG_KEY } from '../core/infrastructure/plugins/dex/constants'
import { JupiterSnapshotConfigSchema } from '../core/infrastructure/plugins/jupiter/configuration/jupiter-config'
import { JUPITER_CONFIG_KEY } from '../core/infrastructure/plugins/jupiter/constants'
import { LifiSnapshotConfigSchema } from '../core/infrastructure/plugins/lifi/configuration/lifi-config'
import { LIFI_CONFIG_KEY } from '../core/infrastructure/plugins/lifi/constants'
import { RaydiumSnapshotConfigSchema } from '../core/infrastructure/plugins/raydium/configuration/raydium-config'
import { RAYDIUM_CONFIG_KEY } from '../core/infrastructure/plugins/raydium/constants'

export const SnapshotPluginsConfigSchema = z.object({
	[DEX_CONFIG_KEY]: DexSnapshotConfigSchema.optional(),
	[JUPITER_CONFIG_KEY]: JupiterSnapshotConfigSchema.optional(),
	[LIFI_CONFIG_KEY]: LifiSnapshotConfigSchema.optional(),
	[RAYDIUM_CONFIG_KEY]: RaydiumSnapshotConfigSchema.optional(),
})
