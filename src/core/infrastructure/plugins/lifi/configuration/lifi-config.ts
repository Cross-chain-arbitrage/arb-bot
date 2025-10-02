import { z } from 'zod'
import {
	TokenId,
	tokenIdScheme,
} from '../../../../domain/value-objects/token-id'
import { LifiConfig } from '../types'

export const LIFI_CONFIG_KEY = 'lifiConfig'

export const lifiConfigScheme: z.ZodType<LifiConfig | undefined> = z
	.object({
		edges: z.array(
			z.object({
				from: tokenIdScheme as z.ZodType<TokenId>,
				to: tokenIdScheme as z.ZodType<TokenId>,
			}),
		),
		interpolationParams: z.object({
			minStartValueUsd: z.number(),
			maxStartValueUsd: z.number(),
			runCount: z.number(),
		}),
	})
	.optional()
