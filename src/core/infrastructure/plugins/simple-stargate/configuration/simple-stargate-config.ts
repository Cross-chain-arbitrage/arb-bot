import { z } from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { SimpleStargateGraphConfig } from '../types'

export const SimpleStargateGraphConfigSchema: z.ZodType<SimpleStargateGraphConfig> =
	z.object({
		edges: z.array(
			z.object({
				from: tokenIdScheme,
				to: tokenIdScheme,
			}),
		),
	})
