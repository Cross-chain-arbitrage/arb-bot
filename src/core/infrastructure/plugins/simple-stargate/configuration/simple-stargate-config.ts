import { z } from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { SimpleStargateConfig } from '../types'

export const SIMPLE_STARGATE_CONFIG_KEY = 'simpleStargate'

export const simpleStargateConfigScheme: z.ZodType<
	SimpleStargateConfig | undefined
> = z
	.object({
		edges: z.array(
			z.object({
				from: tokenIdScheme,
				to: tokenIdScheme,
			}),
		),
	})
	.optional()
