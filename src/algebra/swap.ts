import { Address, PublicActions, WalletClient } from "viem"
import { ALGEBRA_POOL_ABI } from "../abi/algebra/algebraPool"
import { Token } from "../utils/token"

interface SwapParams {
	poolAddress: Address
	tokenIn: Token
	tokenOut: Token
	amountIn: bigint
	zeroToOne: boolean // true if token0 to token1, false if token1 to token0
	slippage: number // in basis points (e.g., 50 = 0.5%)
}

interface SwapResult {
	amountIn: bigint
	amountOut: bigint
	priceImpact: number
}

export async function simulateAlgebraSwap(
	params: SwapParams,
	client: WalletClient,
): Promise<SwapResult> {
	const { poolAddress, tokenIn, tokenOut, amountIn, zeroToOne, slippage } =
		params

	// Get current pool state
	const [token0, token1] = await Promise.all([
		client.readContract({
			address: poolAddress,
			abi: ALGEBRA_POOL_ABI,
			functionName: "token0",
		}),
		client.readContract({
			address: poolAddress,
			abi: ALGEBRA_POOL_ABI,
			functionName: "token1",
		}),
	])

	// Verify token order
	if (zeroToOne && tokenIn.address !== token0) {
		throw new Error("Token order mismatch")
	}
	if (!zeroToOne && tokenIn.address !== token1) {
		throw new Error("Token order mismatch")
	}

	// Calculate minimum amount out with slippage
	const minAmountOut =
		(amountIn * BigInt(Math.floor((10000 - slippage) * 100))) /
		BigInt(10000)

	// Simulate swap
	const { result } = await client.simulateContract({
		address: poolAddress,
		abi: ALGEBRA_POOL_ABI,
		functionName: "swap",
		args: [
			"0x0000000000000000000000000000000000000000", // recipient
			zeroToOne,
			amountIn,
			BigInt(0), // limitSqrtPrice (0 = no limit)
			"0x", // data
		],
	})

	const amount0: bigint = result[0]
	const amount1: bigint = result[1]

	const amountOut = zeroToOne ? -amount1 : -amount0

	// Calculate price impact
	const priceImpact = calculatePriceImpact(
		amountIn,
		amountOut,
		tokenIn,
		tokenOut,
	)

	return {
		amountIn,
		amountOut,
		priceImpact,
	}
}

export async function executeAlgebraSwap(
	params: SwapParams,
	client: WalletClient & PublicActions,
): Promise<SwapResult> {
	const { poolAddress, tokenIn, tokenOut, amountIn, zeroToOne, slippage } =
		params

	// First simulate the swap
	const simulation = await simulateAlgebraSwap(params, client)

	// Calculate minimum amount out with slippage
	const minAmountOut =
		(simulation.amountOut * BigInt(Math.floor((10000 - slippage) * 100))) /
		BigInt(10000)

	// Execute swap
	const hash = await client.writeContract({
		address: poolAddress,
		abi: ALGEBRA_POOL_ABI,
		functionName: "swap",
		args: [
			client.account?.address ||
				"0x0000000000000000000000000000000000000000",
			zeroToOne,
			amountIn,
			BigInt(0),
			"0x",
		],
	})

	// Wait for transaction
	const receipt = await client.waitForTransactionReceipt({ hash })

	return simulation
}

function calculatePriceImpact(
	amountIn: bigint,
	amountOut: bigint,
	tokenIn: Token,
	tokenOut: Token,
): number {
	// This is a simplified calculation. In production, you'd want to:
	// 1. Get the current pool price
	// 2. Calculate the effective price of the swap
	// 3. Compare the two to get the price impact
	return 0 // Placeholder
}
