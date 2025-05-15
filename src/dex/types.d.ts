import { Token } from '../utils/tokens/Token'
import { Address } from 'viem'

declare global {
	interface SwapParams {
		tokenIn: Token
		tokenOut: Token
		amountIn: bigint
		slippage?: number // in basis points (e.g., 50 = 0.5%)
	}

	interface PoolImmutables {
		token0: Token
		token1: Token
		fee: number
		tickSpacing: number
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
}
