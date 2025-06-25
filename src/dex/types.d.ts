import { Address, SimulateContractReturnType } from 'viem'
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
		sqrtPriceX96Index: number // index in slot0/globalState result for sqrtPriceX96
		feeFunction: string
		tickSpacingFunction: string
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

	type SimulateRequestWithAccount = SimulateContractReturnType['request'] & {
		account: Account
	}
}
