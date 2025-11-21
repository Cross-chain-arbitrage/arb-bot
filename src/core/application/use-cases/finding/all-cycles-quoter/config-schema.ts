import z from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { AllCyclesQuoterConfig } from './types'

export const AllCyclesQuoterConfigSchema: z.ZodType<AllCyclesQuoterConfig> =
	z.object({
		delayBetweenPathsMs: z.number(),
		startAmount: z.number(),
		startTokenId: tokenIdScheme,
	})
