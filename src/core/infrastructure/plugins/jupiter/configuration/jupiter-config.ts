import { z } from 'zod'
import {
	TokenId,
	tokenIdScheme,
} from '../../../../domain/value-objects/token-id'
import { JupiterConfig } from '../types'

export const JUPITER_CONFIG_KEY = 'jupiterConfig'

export const jupiterConfigScheme: z.ZodType<JupiterConfig | undefined> = z
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
