import z from 'zod'
import {
	TokenId,
	tokenIdScheme,
} from '../../../../domain/value-objects/token-id'
import { OftConfig } from '../types'

export const OFT_CONFIG_KEY = 'oftConfig'

export const oftConfigScheme: z.ZodType<OftConfig | undefined> = z
	.object({
		edges: z.array(
			z.object({
				from: tokenIdScheme as z.ZodType<TokenId>,
				to: tokenIdScheme as z.ZodType<TokenId>,
			}),
		),
	})
	.optional()
