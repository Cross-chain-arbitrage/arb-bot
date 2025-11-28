import z from 'zod'
import { tokenIdSchema } from '../../../../domain/value-objects/token-id'
import { RelayGraphConfig } from '../types'

export const RelayGraphConfigSchema: z.ZodType<RelayGraphConfig> = z.object({
	edges: z.array(
		z.object({
			from: tokenIdSchema,
			to: tokenIdSchema,
		}),
	),
})
