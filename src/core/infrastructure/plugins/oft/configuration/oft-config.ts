import z from 'zod'
import { tokenIdSchema } from '../../../../domain/value-objects/token-id'
import { OftGraphConfig } from '../types'

export const OftGraphConfigSchema: z.ZodType<OftGraphConfig> = z.object({
	edges: z.array(
		z.object({
			from: tokenIdSchema,
			to: tokenIdSchema,
		}),
	),
})
