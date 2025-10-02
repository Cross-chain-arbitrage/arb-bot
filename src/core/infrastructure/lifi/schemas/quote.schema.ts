import * as z from 'zod'

export const AddressSchema = z.enum([
	'0x0000000000000000000000000000000000000000',
	'0x5A7a2bf9fFae199f088B25837DcD7E115CF8E1bb',
	'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
])
export type Address = z.infer<typeof AddressSchema>

export const CoinKeySchema = z.enum(['ETH', 'IMO', 'USDC'])
export type CoinKey = z.infer<typeof CoinKeySchema>

export const NameSchema = z.enum(['ETH', 'IMO', 'USD Coin'])
export type Name = z.infer<typeof NameSchema>

export const TokenSchema = z.object({
	address: AddressSchema,
	chainId: z.number(),
	symbol: CoinKeySchema,
	decimals: z.number(),
	name: NameSchema,
	coinKey: CoinKeySchema,
	logoURI: z.string(),
	priceUSD: z.string(),
})
export type Token = z.infer<typeof TokenSchema>

export const FeeSplitSchema = z.object({
	integratorFee: z.string(),
	lifiFee: z.string(),
})
export type FeeSplit = z.infer<typeof FeeSplitSchema>

export const GasCostSchema = z.object({
	type: z.string(),
	price: z.string(),
	estimate: z.string(),
	limit: z.string(),
	amount: z.string(),
	amountUSD: z.string(),
	token: TokenSchema,
})
export type GasCost = z.infer<typeof GasCostSchema>

export const ToolDetailsSchema = z.object({
	key: z.string(),
	name: z.string(),
	logoURI: z.string(),
})
export type ToolDetails = z.infer<typeof ToolDetailsSchema>

export const TransactionRequestSchema = z.object({
	value: z.string(),
	to: z.string(),
	data: z.string(),
	chainId: z.number(),
	gasPrice: z.string(),
	gasLimit: z.string(),
	from: z.string(),
})
export type TransactionRequest = z.infer<typeof TransactionRequestSchema>

export const ActionSchema = z.object({
	fromToken: TokenSchema,
	fromAmount: z.string(),
	toToken: TokenSchema,
	fromChainId: z.number(),
	toChainId: z.number(),
	slippage: z.number(),
	fromAddress: z.string(),
	toAddress: z.string(),
})
export type Action = z.infer<typeof ActionSchema>

export const FeeCostSchema = z.object({
	name: z.string(),
	description: z.string(),
	token: TokenSchema,
	amount: z.string(),
	amountUSD: z.string(),
	percentage: z.string(),
	included: z.boolean(),
	feeSplit: FeeSplitSchema,
})
export type FeeCost = z.infer<typeof FeeCostSchema>

export const EstimateSchema = z.object({
	tool: z.string(),
	approvalAddress: z.string(),
	toAmountMin: z.string(),
	toAmount: z.string(),
	fromAmount: z.string(),
	feeCosts: z.array(FeeCostSchema),
	gasCosts: z.array(GasCostSchema),
	executionDuration: z.number(),
	fromAmountUSD: z.string().optional(),
	toAmountUSD: z.string().optional(),
})
export type Estimate = z.infer<typeof EstimateSchema>

export const IncludedStepSchema = z.object({
	id: z.string(),
	type: z.string(),
	action: ActionSchema,
	estimate: EstimateSchema,
	tool: z.string(),
	toolDetails: ToolDetailsSchema,
})
export type IncludedStep = z.infer<typeof IncludedStepSchema>

export const QuoteSchema = z.object({
	type: z.string(),
	id: z.string(),
	tool: z.string(),
	toolDetails: ToolDetailsSchema,
	action: ActionSchema,
	estimate: EstimateSchema,
	includedSteps: z.array(IncludedStepSchema),
	integrator: z.string(),
	transactionRequest: TransactionRequestSchema,
})
export type Quote = z.infer<typeof QuoteSchema>
