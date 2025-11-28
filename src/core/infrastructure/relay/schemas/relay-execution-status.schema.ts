import * as z from 'zod'

export const ExecutionStatusSchema = z.object({
	status: z.enum([
		'refund',
		'delayed',
		'waiting',
		'failed',
		'pending',
		'success',
	]),
})

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>

export const ExecutionFullStatusSchema = z.object({
	status: z.enum(['success', 'failed', 'refund', 'delayed', 'pending']),
	inTxHashes: z.array(z.string()),
	txHashes: z.array(z.string()),
	time: z.number(),
	originChainId: z.number(),
	destinationChainId: z.number(),
})

export type ExecutionFullStatus = z.infer<typeof ExecutionFullStatusSchema>
