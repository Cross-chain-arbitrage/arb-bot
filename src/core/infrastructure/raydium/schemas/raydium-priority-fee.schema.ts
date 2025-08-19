import * as z from 'zod'

export const DefaultSchema = z.object({
	vh: z.number(),
	h: z.number(),
	m: z.number(),
})
export type Default = z.infer<typeof DefaultSchema>

export const DataSchema = z.object({
	default: DefaultSchema,
})
export type Data = z.infer<typeof DataSchema>

export const PriorityFeeSchema = z.object({
	id: z.string(),
	success: z.boolean(),
	data: DataSchema,
})
export type PriorityFee = z.infer<typeof PriorityFeeSchema>
