import { z } from 'zod'
import { tokenIdSchema } from '../../../../domain/value-objects/token-id'
import { SimpleStargateGraphConfig } from '../types'

export const SimpleStargateGraphConfigSchema: z.ZodType<SimpleStargateGraphConfig> =
	z.object({
		edges: z.array(
			z.object({
				from: tokenIdSchema,
				to: tokenIdSchema,
			}),
		),
	})
