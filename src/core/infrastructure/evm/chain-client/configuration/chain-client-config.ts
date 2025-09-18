import { z } from 'zod'
import { ChainClientConfig, CustomChain, RpcProviders, RpcUrl } from '../types'

export const CHAIN_CLIENT_CONFIG_KEY = 'chainClientConfig'

export const rpcProvidersScheme: z.ZodType<RpcProviders> = z
	.record(
		z.string(),
		z.array(
			(
				z.union([
					z.string().regex(/^alchemy$/),
					z.url().regex(/^https?:\/\/[^\s$.?#].[^\s]*$/i),
				]) as z.ZodType<RpcUrl>
			).describe(
				'rpc url or "alchemy" to automatically build alchemy rpc url',
			),
		),
	)
	.describe('key is chain id, value is array of rpc urls or "alchemy"')

export const customChainsScheme: z.ZodType<CustomChain[]> = z.array(
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

export const chainClientConfigScheme: z.ZodType<ChainClientConfig | undefined> =
	z
		.object({
			rpcProviders: rpcProvidersScheme.optional(),
			customChains: customChainsScheme.optional(),
		})
		.optional()
