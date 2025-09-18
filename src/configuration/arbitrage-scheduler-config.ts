import z from 'zod'
import { ArbitrageSchedulerConfig } from '../core/presentation/arbitrage-scheduler/types'

export const arbitrageSchedulerConfigScheme: z.ZodType<ArbitrageSchedulerConfig> =
	z.object({
		runInterval: z.number(),
		prepareExecution: z.boolean(),
	})
