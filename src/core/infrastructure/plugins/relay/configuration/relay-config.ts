import z from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { RelayGraphConfig } from '../types'

export const RelayGraphConfigSchema: z.ZodType<RelayGraphConfig> = z.object({
	edges: z.array(
		z.object({
			from: tokenIdScheme,
			to: tokenIdScheme,
		}),
	),
})
