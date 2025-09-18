import { z } from 'zod'

export const balanceReporterSchedulerConfigScheme = z.object({
	runInterval: z.number(),
})
