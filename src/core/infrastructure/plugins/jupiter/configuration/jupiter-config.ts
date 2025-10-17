import { z } from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { JupiterConfig } from '../types'

export const JUPITER_CONFIG_KEY = 'jupiterConfig'

export const jupiterConfigScheme: z.ZodType<JupiterConfig | undefined> = z
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
