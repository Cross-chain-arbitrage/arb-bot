import z from 'zod'
import { StargateConfig } from '../types'

export const STARGATE_CONFIG_KEY = 'stargateConfig'

export const stargateConfigScheme: z.ZodType<StargateConfig | undefined> = z
	.object({
		connectSecondaryChains: z.boolean(),
		baseChainId: z.number(),
	})
	.optional()
