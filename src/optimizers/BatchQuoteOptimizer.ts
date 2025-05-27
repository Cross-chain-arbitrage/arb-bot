import { Pool } from '../dex/Pool'
import { Token } from '../utils/tokens/Token'

interface OptimizedSwap {
	amountIn: bigint
	amountOut: bigint
	amountInUSD: number
	amountOutUSD: number
	potentialProfit: number
}

interface SwapQuote {
	amountIn: bigint
	amountOut: bigint
	amountInUSD: number
	amountOutUSD: number
	potentialProfit: number
}

export class BatchQuoteOptimizerError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, BatchQuoteOptimizerError.prototype)
		this.name = 'BatchQuoteOptimizerError'
	}
}

export class BatchQuoteOptimizer {
	private static calculateAmountIn(
		tokenIn: Token,
		tokenInPrice: number,
		initialValueUSD: number,
		stepUSD: number,
		index: number,
	): bigint {
		const tokensAmount = (initialValueUSD + stepUSD * index) / tokenInPrice
		return tokenIn.parseUnits(tokensAmount.toString())
	}

	private static calculateSwapQuote(
		amountIn: bigint,
		amountOut: bigint,
		tokenIn: Token,
		tokenOut: Token,
		tokenInPrice: number,
		tokenOutPrice: number,
	): SwapQuote {
		const amountInUSD = Number(tokenIn.formatUnits(amountIn)) * tokenInPrice
		const amountOutUSD =
			Number(tokenOut.formatUnits(amountOut)) * tokenOutPrice
		const potentialProfit = amountOutUSD - amountInUSD

		return {
			amountIn,
			amountOut,
			amountInUSD,
			amountOutUSD,
			potentialProfit,
		}
	}

	static async optimizeAmountIn(
		tokenIn: Token,
		tokenOut: Token,
		tokenInPrice: number,
		tokenOutPrice: number,
		pool: Pool,
		initialValueUSD: number = 15,
		stepUSD: number = 15,
		stepsAmount: number = 22,
	): Promise<OptimizedSwap> {
		const amounts = Array.from({ length: stepsAmount }, (_, i) =>
			this.calculateAmountIn(
				tokenIn,
				tokenInPrice,
				initialValueUSD,
				stepUSD,
				i,
			),
		)

		const quotes = await Promise.all(
			amounts.map((amount) =>
				pool.quoteSwap({ tokenIn, tokenOut, amountIn: amount }),
			),
		)

		const swapQuotes = quotes.map((quote, i) =>
			this.calculateSwapQuote(
				amounts[i],
				quote.amountOut,
				tokenIn,
				tokenOut,
				tokenInPrice,
				tokenOutPrice,
			),
		)

		const bestQuote = swapQuotes.reduce((best, current) =>
			current.potentialProfit > best.potentialProfit ? current : best,
		)

		return {
			amountIn: bestQuote.amountIn,
			amountOut: bestQuote.amountOut,
			amountInUSD: bestQuote.amountInUSD,
			amountOutUSD: bestQuote.amountOutUSD,
			potentialProfit: bestQuote.potentialProfit,
		}
	}
}
