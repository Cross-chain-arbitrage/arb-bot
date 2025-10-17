import { z } from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { LifiConfig } from '../types'

export const LIFI_CONFIG_KEY = 'lifiConfig'

export const lifiConfigScheme: z.ZodType<LifiConfig | undefined> = z
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
