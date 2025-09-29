import z from 'zod'
import { ArbitrageExecutorConfig } from '../core/application/use-cases/execution/arbitrage-executor/types'
import { TokenId, tokenIdScheme } from '../core/domain/value-objects/token-id'

export const arbitrageExecutorConfigScheme: z.ZodType<
	ArbitrageExecutorConfig | undefined
> = z
	.object({
		startRules: z.array(
			z.object({
				startTokenId: tokenIdScheme as z.ZodType<TokenId>,
				directionTokenId: tokenIdScheme as z.ZodType<TokenId>,
			}),
		),
	})
	.optional()
