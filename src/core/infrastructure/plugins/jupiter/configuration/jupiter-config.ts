import { z } from 'zod'
import { tokenIdSchema } from '../../../../domain/value-objects/token-id'
import { JupiterGraphConfig, JupiterSnapshotConfig } from '../types'

export const JupiterSnapshotConfigSchema: z.ZodType<JupiterSnapshotConfig> =
	z.object({
		interpolationParams: z.object({
			minStartValueUsd: z.number(),
			maxStartValueUsd: z.number(),
			runCount: z.number(),
		}),
	})

export const JupiterGraphConfigSchema: z.ZodType<JupiterGraphConfig> = z.object(
	{
		edges: z.array(
			z.object({
				from: tokenIdSchema,
				to: tokenIdSchema,
			}),
		),
	},
)
