import { z } from 'zod'
import {
	TokenId,
	tokenIdScheme,
} from '../../../../domain/value-objects/token-id'
import { SimpleStargateConfig } from '../types'

export const SIMPLE_STARGATE_CONFIG_KEY = 'simpleStargate'

export const simpleStargateConfigScheme: z.ZodType<
	SimpleStargateConfig | undefined
> = z
	.object({
		edges: z.array(
			z.object({
				from: tokenIdScheme as z.ZodType<TokenId>,
				to: tokenIdScheme as z.ZodType<TokenId>,
			}),
		),
	})
	.optional()
