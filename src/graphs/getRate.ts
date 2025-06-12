import { zeroAddress } from 'viem'
import { Stargate } from '../bridges/stargate/Stargate'
import { Pool } from '../dex/Pool'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'

// // For DEX pools
async function getPoolRate(
	pool: Pool,
	tokenIn: Token,
	amountIn: bigint,
): Promise<{ rate: number; amountOut: bigint }> {
	const { amountOut } = await pool.quoteSwap({
		amountIn: amountIn,
		tokenIn: tokenIn,
		tokenOut: pool.token1,
		slippage: 5000,
	})

	const rate = -Math.log(Number(amountOut) / Number(amountIn))
	return { rate, amountOut }
}

// // For bridges
async function getStargateBridgeRate(
	tokenIn: Token | NativeCurrency,
	tokenOut: Token | NativeCurrency,
	amountIn: bigint,
): Promise<{ rate: number; amountOut: bigint }> {
	const quote = await Stargate.quote(
		tokenIn,
		tokenOut.chainId,
		zeroAddress,
		amountIn,
	)

	let amountOut: bigint
	if (quote.isOFT) {
		amountOut = quote.oftFees?.oftLimit.maxAmountLD ?? 0n
	} else {
		amountOut = amountIn
	}

	const rate = -Math.log(Number(amountOut) / Number(amountIn))
	return { rate, amountOut }
}
