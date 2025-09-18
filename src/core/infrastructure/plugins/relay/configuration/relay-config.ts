import z from 'zod'
import {
	TokenId,
	tokenIdScheme,
} from '../../../../domain/value-objects/token-id'
import { RelayConfig } from '../types'

export const RELAY_CONFIG_KEY = 'relayConfig'

export const relayConfigScheme: z.ZodType<RelayConfig | undefined> = z
	.object({
		edges: z.array(
			z.object({
				from: tokenIdScheme as z.ZodType<TokenId>,
				to: tokenIdScheme as z.ZodType<TokenId>,
			}),
		),
	})
	.optional()
