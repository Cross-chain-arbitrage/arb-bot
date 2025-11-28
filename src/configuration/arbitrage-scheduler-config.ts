import z from 'zod'
import { ArbitrageSchedulerConfig } from '../core/presentation/arbitrage-scheduler/types'

export const arbitrageSchedulerConfigSchema: z.ZodType<
	ArbitrageSchedulerConfig | undefined
> = z
	.object({
		prepareExecution: z.boolean(),
	})
	.optional()
