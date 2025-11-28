import { z } from 'zod'
import { tokenIdSchema } from '../../../../domain/value-objects/token-id'
import { LifiGraphConfig, LifiSnapshotConfig } from '../types'

export const LifiSnapshotConfigSchema: z.ZodType<LifiSnapshotConfig> = z.object(
	{
		interpolationParams: z.object({
			minStartValueUsd: z.number(),
			maxStartValueUsd: z.number(),
			runCount: z.number(),
		}),
	},
)

export const LifiGraphConfigSchema: z.ZodType<LifiGraphConfig> = z.object({
	edges: z.array(
		z.object({
			from: tokenIdSchema,
			to: tokenIdSchema,
		}),
	),
})
