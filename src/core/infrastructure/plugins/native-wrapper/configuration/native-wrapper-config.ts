import z from 'zod'
import { NativeWrapperGraphConfig } from '../types'

export const NativeWrapperGraphConfigSchema: z.ZodType<NativeWrapperGraphConfig> =
	z.object({
		chainIds: z.array(z.number()),
	})
