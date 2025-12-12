import * as z from 'zod'

export const DurationSchema = z.object({
	estimated: z.number(),
})
export type Duration = z.infer<typeof DurationSchema>

export const FeeSchema = z.object({
	token: z.string(),
	chainKey: z.string(),
	amount: z.string(),
	type: z.string(),
})
export type Fee = z.infer<typeof FeeSchema>

export const TransactionSchema = z.object({
	encoding: z.string(),
	data: z.string(),
})
export type Transaction = z.infer<typeof TransactionSchema>

export const StepSchema = z.object({
	type: z.string(),
	sender: z.string(),
	chainKey: z.string(),
	transaction: TransactionSchema,
})
export type Step = z.infer<typeof StepSchema>

export const QuoteSchema = z.object({
	route: z.string(),
	error: z.null(),
	srcAmount: z.string(),
	dstAmount: z.string(),
	srcAmountMax: z.string(),
	dstAmountMin: z.string(),
	srcToken: z.string(),
	dstToken: z.string(),
	srcAddress: z.string(),
	dstAddress: z.string(),
	srcChainKey: z.string(),
	dstChainKey: z.string(),
	dstNativeAmount: z.string(),
	duration: DurationSchema,
	fees: z.array(FeeSchema),
	steps: z.array(StepSchema),
})
export type QuoteSolanaSrc = z.infer<typeof QuoteSchema>

export const QuoteResponseSolanaSrcSchema = z.object({
	quotes: z.array(QuoteSchema),
})
export type QuoteResponseSolanaSrc = z.infer<
	typeof QuoteResponseSolanaSrcSchema
>
