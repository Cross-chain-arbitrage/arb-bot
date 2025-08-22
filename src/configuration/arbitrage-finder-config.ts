import z from 'zod'
import { ArbitrageFinderConfig } from '../core/application/use-cases/finding/arbitrage-finder/types'

export const arbitrageFinderConfigScheme: z.ZodType<ArbitrageFinderConfig> =
	z.object({
		opportunityFinding: z.object({
			minStartValueUsd: z.number(),
			maxStartValueUsd: z.number(),
			runCount: z.number(),
			startTokenId: z.string(),
		}),
		opportunityValidation: z.object({
			minProfitUsd: z.number(),
		}),
	})
