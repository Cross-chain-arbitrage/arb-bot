import * as z from 'zod'

export const RoutePlanSchema = z.object({
	poolId: z.string(),
	inputMint: z.string(),
	outputMint: z.string(),
	feeMint: z.string(),
	feeRate: z.number(),
	feeAmount: z.string(),
	remainingAccounts: z.array(z.string()),
	lastPoolPriceX64: z.string().optional(),
})
export type RoutePlan = z.infer<typeof RoutePlanSchema>

export const DataSchema = z.object({
	swapType: z.string(),
	inputMint: z.string(),
	inputAmount: z.string(),
	outputMint: z.string(),
	outputAmount: z.string(),
	otherAmountThreshold: z.string(),
	slippageBps: z.number(),
	priceImpactPct: z.number(),
	referrerAmount: z.string(),
	routePlan: z.array(RoutePlanSchema),
})
export type Data = z.infer<typeof DataSchema>

export const RaydiumQuoteSchema = z.object({
	id: z.string(),
	success: z.boolean(),
	version: z.string(),
	data: DataSchema,
})
export type RaydiumQuote = z.infer<typeof RaydiumQuoteSchema>
