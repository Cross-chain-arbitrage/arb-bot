import * as z from 'zod'
import { chainIdSchema } from '../../../../domain/value-objects/chain-id'

export const IdSchema = z.object({
	chain_id: chainIdSchema,
	address: z.string(),
})
export type Id = z.infer<typeof IdSchema>

export const TokenDataSchema = z.object({
	id: IdSchema,
	chain_id: z.number(),
	address: z.string(),
	symbol: z.string(),
	decimals: z.number(),
	name: z.string(),
})
export type TokenData = z.infer<typeof TokenDataSchema>
