interface PoolInfo {
	token0: Address
	token1: Address
	fee: number
	sqrtPriceX96: bigint
	liquidity: bigint
	tick: number
}

interface SwapParams {
	tokenIn: Token
	tokenOut: Token
	amountIn: bigint
	slippage?: number // in basis points (e.g., 50 = 0.5%)
}

interface PoolTokens {
	token0: Address
	token1: Address
}

//TODO: extract from abi
type SwapArgs = {
	tokenIn: Address
	tokenOut: Address
	deployer: Address
	recipient: Address
	deadline: bigint
	amountIn: bigint
	amountOutMinimum: bigint
	limitSqrtPrice: bigint
}
