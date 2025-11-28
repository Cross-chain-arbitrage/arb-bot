import { z } from 'zod'

export const balanceReporterSchedulerConfigSchema = z.object({
	runInterval: z.number(),
})
