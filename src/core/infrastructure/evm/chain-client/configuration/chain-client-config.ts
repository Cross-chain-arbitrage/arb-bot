import { z } from 'zod'
import { ChainClientConfig, CustomChain, RpcSettings, RpcUrl } from '../types'

export const CHAIN_CLIENT_CONFIG_KEY = 'chainClientConfig'

export const rpcSettingsSchema: z.ZodType<RpcSettings> = z.record(
	z.string(),
	z.object({
		rpcUrls: z.array(
			(
				z.union([
					z.string().regex(/^alchemy$/),
					z.url().regex(/^https?:\/\/[^\s$.?#].[^\s]*$/i),
				]) as z.ZodType<RpcUrl>
			).describe(
				'rpc url or "alchemy" to automatically build alchemy rpc url',
			),
		),
		disableDefaultRpcUrl: z.boolean().default(false),
	}),
)

export const customChainsSchema: z.ZodType<CustomChain[]> = z.array(
	z.object({
		chainId: z.number(),
		defaultRpcUrl: z.url(),
		chainName: z.string(),
		nativeCurrency: z.object({
			name: z.string(),
			symbol: z.string(),
			decimals: z.number(),
		}),
	}),
)

export const ChainClientConfigSchema: z.ZodType<ChainClientConfig | undefined> =
	z
		.object({
			rpcSettings: rpcSettingsSchema.optional(),
			customChains: customChainsSchema.optional(),
		})
		.optional()
