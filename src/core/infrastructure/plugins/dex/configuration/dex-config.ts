import z from 'zod'
import { DexRegistry } from '../../../dex/dex-registry'
import { PoolType } from '../../../dex/pool-utils'
import { DexGraphConfig, DexSnapshotConfig } from '../types'

const poolTypes = Object.keys(DexRegistry) as PoolType[]

export const DexSnapshotConfigSchema: z.ZodType<DexSnapshotConfig> = z.object({
	interpolationParams: z.object({
		minStartValueUsd: z.number(),
		maxStartValueUsd: z.number(),
		runCount: z.number(),
	}),
})

export const DexGraphConfigSchema: z.ZodType<DexGraphConfig> = z.object({
	pools: z.array(
		z.object({
			address: z
				.string()
				.regex(/^0x[a-fA-F0-9]{40}$/) as z.ZodType<Address>,
			chainId: z.number(),
			type: z.enum(poolTypes),
		}),
	),
})
