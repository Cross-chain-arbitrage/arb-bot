import z from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { MockGraphConfig } from '../types'

export const MockGraphConfigSchema: z.ZodType<MockGraphConfig> = z.object({
	edges: z
		.array(
			z.object({
				from: tokenIdScheme,
				to: tokenIdScheme,
			}),
		)
		.optional(),
})
