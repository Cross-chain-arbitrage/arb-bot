import * as z from 'zod'

export const DatumSchema = z.object({
	transaction: z.string(),
})
export type Datum = z.infer<typeof DatumSchema>

export const TransactionSchema = z.object({
	id: z.string(),
	version: z.string(),
	success: z.boolean(),
	data: z.array(DatumSchema),
})
export type Transaction = z.infer<typeof TransactionSchema>
