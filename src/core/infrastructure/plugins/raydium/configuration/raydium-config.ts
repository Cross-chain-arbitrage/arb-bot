import { z } from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { RaydiumConfig } from '../types'

export const RAYDIUM_CONFIG_KEY = 'raydiumConfig'

export const raydiumConfigScheme: z.ZodType<RaydiumConfig | undefined> = z
	.object({
		edges: z.array(
			z.object({
				from: tokenIdScheme,
				to: tokenIdScheme,
			}),
		),
		interpolationParams: z.object({
			minStartValueUsd: z.number(),
			maxStartValueUsd: z.number(),
			runCount: z.number(),
		}),
	})
	.optional()
