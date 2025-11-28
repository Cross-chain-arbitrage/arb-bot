import z from 'zod'
import { tokenIdSchema } from '../../../../domain/value-objects/token-id'
import { MockGraphConfig } from '../types'

export const MockGraphConfigSchema: z.ZodType<MockGraphConfig> = z.object({
	edges: z
		.array(
			z.object({
				from: tokenIdSchema,
				to: tokenIdSchema,
			}),
		)
		.optional(),
})
