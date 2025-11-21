import z from 'zod'
import { OpportunityReporterConfig } from './types'

export const opportunityReporterConfigSchema: z.ZodType<OpportunityReporterConfig> =
	z.object({
		minProfitToReport: z.number(),
	})
