import { Pool } from './dex/Pool'
import { BatchQuoteOptimizer } from './optimizers/BatchQuoteOptimizer'

export async function findArbitrageOpportunity(
	pool: Pool,
	actualPrice0USD: number,
	actualPrice1USD: number,
) {
	const { price } = await pool.getPrices()
	const priceRatio = actualPrice0USD / actualPrice1USD

	// logger.info(`price: ${price}`)
	// logger.info(`priceRatio: ${priceRatio}`)
	// const difference = calculatePriceDiff(price, priceRatio)

	// logger.info(`Difference: ${difference.toFixed(2)}%`)

	const tokenIn = price > priceRatio ? pool.token0 : pool.token1
	// logger.info(`Token in: ${tokenIn.symbol}`)
	const tokenOut = tokenIn === pool.token0 ? pool.token1 : pool.token0
	// logger.info(`Token out: ${tokenOut.symbol}`)

	const tokenInPrice =
		tokenIn === pool.token0 ? actualPrice0USD : actualPrice1USD
	const tokenOutPrice =
		tokenOut === pool.token0 ? actualPrice0USD : actualPrice1USD

	const { amountIn, amountOut, amountInUSD, amountOutUSD, potentialProfit } =
		await BatchQuoteOptimizer.optimizeAmountIn(
			tokenIn,
			tokenOut,
			tokenInPrice,
			tokenOutPrice,
			pool,
			50,
			50,
			40,
		)

	// logger.info(
	// 	`AmountIn: ${tokenIn.formatUnits(amountIn)}, ${tokenIn.symbol} ($${amountInUSD.toFixed(2)} USD)`,
	// )
	// logger.info(
	// 	`Amount out: ${tokenOut.formatUnits(amountOut)}, ${tokenOut.symbol} ($${amountOutUSD.toFixed(2)} USD)`,
	// )
	// logger.warn(`Potential profit: $${potentialProfit.toFixed(2)} USD`)

	return {
		tokenIn,
		tokenOut,
		amountIn,
		amountOut,
		amountInUSD,
		amountOutUSD,
		potentialProfit,
	}
}
