import { z } from 'zod'
import { tokenIdSchema } from '../../../../domain/value-objects/token-id'
import { RaydiumGraphConfig, RaydiumSnapshotConfig } from '../types'

export const RaydiumSnapshotConfigSchema: z.ZodType<RaydiumSnapshotConfig> =
	z.object({
		interpolationParams: z.object({
			minStartValueUsd: z.number(),
			maxStartValueUsd: z.number(),
			runCount: z.number(),
		}),
	})

export const RaydiumGraphConfigSchema: z.ZodType<RaydiumGraphConfig> = z.object(
	{
		edges: z.array(
			z.object({
				from: tokenIdSchema,
				to: tokenIdSchema,
			}),
		),
	},
)
