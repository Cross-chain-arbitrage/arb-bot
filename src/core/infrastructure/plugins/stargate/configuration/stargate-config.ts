import z from 'zod'
import { StargateGraphConfig } from '../types'

export const StargateGraphConfigSchema: z.ZodType<StargateGraphConfig> =
	z.object({
		connectSecondaryChains: z.boolean(),
		baseChainId: z.number(),
	})
