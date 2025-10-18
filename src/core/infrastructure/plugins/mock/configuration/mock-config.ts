import z from 'zod'
import { tokenIdScheme } from '../../../../domain/value-objects/token-id'
import { MockConfig } from '../types'

export const MOCK_CONFIG_KEY = 'mockConfig'

export const mockConfigScheme: z.ZodType<MockConfig | undefined> = z
	.object({
		edges: z
			.array(
				z.object({
					from: tokenIdScheme,
					to: tokenIdScheme,
				}),
			)
			.optional(),
	})
	.optional()
