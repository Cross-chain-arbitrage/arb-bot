import * as z from 'zod'

export const MetadataSchema = z.object({
	logoURI: z.string(),
	verified: z.boolean(),
})
export type Metadata = z.infer<typeof MetadataSchema>

export const AppSchema = z.object({
	usd: z.string(),
})
export type App = z.infer<typeof AppSchema>

export const DestinationSchema = z.object({
	usd: z.string(),
	value: z.string(),
	percent: z.string(),
})
export type Destination = z.infer<typeof DestinationSchema>

export const ImpactSchema = z.object({
	usd: z.string(),
	percent: z.string(),
})
export type Impact = z.infer<typeof ImpactSchema>

export const CheckSchema = z.object({
	endpoint: z.string(),
	method: z.string(),
})
export type Check = z.infer<typeof CheckSchema>

export const DataSchema = z.object({
	from: z.string(),
	to: z.string(),
	data: z.string(),
	value: z.string(),
	chainId: z.number(),
	gas: z.string(),
	maxFeePerGas: z.string(),
	maxPriorityFeePerGas: z.string(),
})
export type Data = z.infer<typeof DataSchema>

export const CurrencySchema = z.object({
	chainId: z.number(),
	address: z.string(),
	symbol: z.string(),
	name: z.string(),
	decimals: z.number(),
	metadata: MetadataSchema,
})
export type Currency = z.infer<typeof CurrencySchema>

export const ExpandedPriceImpactSchema = z.object({
	swap: AppSchema,
	execution: AppSchema,
	relay: AppSchema,
	app: AppSchema,
})
export type ExpandedPriceImpact = z.infer<typeof ExpandedPriceImpactSchema>

export const SlippageToleranceSchema = z.object({
	origin: DestinationSchema,
	destination: DestinationSchema,
})
export type SlippageTolerance = z.infer<typeof SlippageToleranceSchema>

export const ItemSchema = z.object({
	status: z.string(),
	data: DataSchema,
	check: CheckSchema,
})
export type Item = z.infer<typeof ItemSchema>

export const CurrencyInSchema = z.object({
	currency: CurrencySchema,
	amount: z.string(),
	amountFormatted: z.string(),
	amountUsd: z.string(),
	minimumAmount: z.string(),
})
export type CurrencyIn = z.infer<typeof CurrencyInSchema>

export const FeesSchema = z.object({
	gas: CurrencyInSchema,
	relayer: CurrencyInSchema,
	relayerGas: CurrencyInSchema,
	relayerService: CurrencyInSchema,
	app: CurrencyInSchema,
	subsidized: CurrencyInSchema,
})
export type Fees = z.infer<typeof FeesSchema>

export const StepSchema = z.object({
	id: z.string(),
	action: z.string(),
	description: z.string(),
	kind: z.string(),
	items: z.array(ItemSchema),
	requestId: z.string(),
	depositAddress: z.string(),
})
export type Step = z.infer<typeof StepSchema>

export const DetailsSchema = z.object({
	operation: z.string(),
	sender: z.string(),
	recipient: z.string(),
	currencyIn: CurrencyInSchema,
	currencyOut: CurrencyInSchema,
	totalImpact: ImpactSchema,
	swapImpact: ImpactSchema,
	expandedPriceImpact: ExpandedPriceImpactSchema,
	rate: z.string(),
	slippageTolerance: SlippageToleranceSchema,
	timeEstimate: z.number(),
	userBalance: z.string(),
})
export type Details = z.infer<typeof DetailsSchema>

export const QuoteEvmSrcSchema = z.object({
	steps: z.array(StepSchema),
	fees: FeesSchema,
	details: DetailsSchema,
})
export type QuoteEvmSrc = z.infer<typeof QuoteEvmSrcSchema>
