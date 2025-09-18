import z from 'zod'
import { DexRegistry } from '../../../dex/dex-registry'
import { PoolType } from '../../../dex/pool-utils'
import { DexConfig } from '../types'

export const DEX_CONFIG_KEY = 'dexConfig'

const poolTypes = Object.keys(DexRegistry) as PoolType[]

export const dexConfigScheme: z.ZodType<DexConfig | undefined> = z
	.object({
		pools: z.array(
			z.object({
				address: z
					.string()
					.regex(/^0x[a-fA-F0-9]{40}$/) as z.ZodType<Address>,
				chainId: z.number(),
				type: z.enum(poolTypes),
			}),
		),
		interpolationParams: z.object({
			minStartValueUsd: z.number(),
			maxStartValueUsd: z.number(),
			runCount: z.number(),
		}),
	})
	.optional()
