import z from 'zod'
import { ArbitrageExecutorConfig } from '../core/application/use-cases/execution/arbitrage-executor/types'
import { tokenIdSchema } from '../core/domain/value-objects/token-id'

export const arbitrageExecutorConfigSchema: z.ZodType<ArbitrageExecutorConfig> =
	z.object({
		startRules: z
			.array(
				z.object({
					startTokenId: tokenIdSchema,
					directionTokenId: tokenIdSchema,
				}),
			)
			.optional(),
		pathRecoveryEnabled: z.boolean(),
	})
