import z from 'zod'
import { ArbitrageExecutorConfig } from '../core/application/use-cases/execution/arbitrage-executor/types'
import { tokenIdScheme } from '../core/domain/value-objects/token-id'

export const arbitrageExecutorConfigScheme: z.ZodType<
	ArbitrageExecutorConfig | undefined
> = z
	.object({
		startRules: z.array(
			z.object({
				startTokenId: tokenIdScheme,
				directionTokenId: tokenIdScheme,
			}),
		),
		pathRecoveryConfig: z.object({
			enabled: z.boolean(),
			minTokenThresholds: z.map(tokenIdScheme, z.number()).optional(),
		}),
	})
	.optional()
