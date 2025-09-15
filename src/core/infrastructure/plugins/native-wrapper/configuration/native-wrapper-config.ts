import z from 'zod'
import { NativeWrapperConfig } from '../types'

export const NATIVE_WRAPPER_CONFIG_KEY = 'nativeWrapperConfig'

export const nativeWrapperConfigScheme: z.ZodType<
	NativeWrapperConfig | undefined
> = z
	.object({
		chainIds: z.array(z.number()),
	})
	.optional()
