import { z } from 'zod'
import { RaydiumConfig } from '../types'

export const RAYDIUM_CONFIG_KEY = 'raydiumConfig'

export const raydiumConfigScheme: z.ZodType<RaydiumConfig | undefined> = z
	.object({
		edges: z.array(
			z.object({
				from: z.string(),
				to: z.string(),
			}),
		),
		interpolationParams: z.object({
			minStartValueUsd: z.number(),
			maxStartValueUsd: z.number(),
			runCount: z.number(),
		}),
	})
	.optional()
