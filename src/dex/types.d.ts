import { Address } from 'viem'
import { Token } from '../primitives/tokens/Token'

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
	type AlgebraSwapArgs = {
		tokenIn: Address
		tokenOut: Address
		deployer: Address
		recipient: Address
		deadline: bigint
		amountIn: bigint
		amountOutMinimum: bigint
		limitSqrtPrice: bigint
	}

	type UniV3SwapArgs = {
		tokenIn: Address
		tokenOut: Address
		fee: number
		recipient: Address
		deadline: bigint
		amountIn: bigint
		amountOutMinimum: bigint
		sqrtPriceLimitX96: bigint
	}

	interface PoolPeriphery {
		quoter: Address
		router: Address
	}

	interface UniV2PoolPeriphery {
		router: Address
	}

	interface UniV3PoolPeriphery {
		quoter: Address
		router: Address
	}

	interface V3PoolConfig {
		type: 'v3-like'
		abi: Abi
		slotFunction: string // 'slot0' or 'globalState'
		slotTickSpacingIndex: number // index in slot0/globalState result for tickSpacing
		feeFunction: string
		tokenFunctions: {
			token0: string
			token1: string
		}
	}

	interface V2PoolConfig {
		type: 'v2-like'
		abi: Abi
		defaultFee: number // basis points
		tokenFunctions: {
			token0: string
			token1: string
		}
	}

	type PoolConfig = V3PoolConfig | V2PoolConfig
}
