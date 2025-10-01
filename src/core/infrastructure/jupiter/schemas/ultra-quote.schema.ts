import * as z from 'zod'

export const SwapInfoSchema = z.object({
	ammKey: z.string(),
	label: z.string(),
	inputMint: z.string(),
	outputMint: z.string(),
	inAmount: z.string(),
	outAmount: z.string(),
	feeAmount: z.string(),
	feeMint: z.string(),
})
export type SwapInfo = z.infer<typeof SwapInfoSchema>

export const RoutePlanSchema = z.object({
	swapInfo: SwapInfoSchema,
	percent: z.number(),
	bps: z.number(),
})
export type RoutePlan = z.infer<typeof RoutePlanSchema>

export const UltraQuoteSchema = z.object({
	inAmount: z.string(),
	outAmount: z.string(),
	otherAmountThreshold: z.string(),
	swapMode: z.string(),
	slippageBps: z.number(),
	priceImpactPct: z.string(),
	routePlan: z.array(RoutePlanSchema),
	feeMint: z.string(),
	feeBps: z.number(),
	signatureFeeLamports: z.number(),
	prioritizationFeeLamports: z.number(),
	rentFeeLamports: z.number(),
	gasless: z.boolean(),
	mode: z.string(),
	inputMint: z.string(),
	outputMint: z.string(),
	swapType: z.string(),
	router: z.string(),
	requestId: z.string(),
	inUsdValue: z.number(),
	outUsdValue: z.number(),
	priceImpact: z.number(),
	swapUsdValue: z.number(),
	totalTime: z.number(),
})
export type UltraQuote = z.infer<typeof UltraQuoteSchema>

export const UltraQuoteWithTxSchema = UltraQuoteSchema.extend({
	taker: z.string(),
	transaction: z.string(),
})

export type UltraQuoteWithTx = z.infer<typeof UltraQuoteWithTxSchema>
