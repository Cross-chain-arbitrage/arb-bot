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
	data: z.string(),
	to: z.string(),
	value: z.string().optional(),
	from: z.string(),
})
export type Transaction = z.infer<typeof TransactionSchema>

export const BridgeTransactionSchema = TransactionSchema.extend({
	value: z.string(),
})
export type BridgeTransaction = z.infer<typeof BridgeTransactionSchema>

export const ApproveStepSchema = z.object({
	type: z.literal('approve'),
	sender: z.string(),
	chainKey: z.string(),
	transaction: TransactionSchema,
})
export type ApproveStep = z.infer<typeof ApproveStepSchema>

export const BridgeStepSchema = z.object({
	type: z.literal('bridge'),
	sender: z.string(),
	chainKey: z.string(),
	transaction: BridgeTransactionSchema,
})
export type BridgeStep = z.infer<typeof BridgeStepSchema>

export const StepSchema = z.discriminatedUnion('type', [
	ApproveStepSchema,
	BridgeStepSchema,
])
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
export type QuoteEvmSrc = z.infer<typeof QuoteSchema>

export const QuoteResponseEvmSrcSchema = z.object({
	quotes: z.array(QuoteSchema),
})
export type QuoteResponseEvmSrc = z.infer<typeof QuoteResponseEvmSrcSchema>
