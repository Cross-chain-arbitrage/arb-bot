import z from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { OftGraphConfig } from '../types'

export const OftGraphConfigSchema: z.ZodType<OftGraphConfig> = z.object({
	edges: z.array(
		z.object({
			from: tokenIdScheme,
			to: tokenIdScheme,
		}),
	),
})
