import { Address, SimulateContractReturnType } from 'viem'
import { Token } from '../primitives/tokens/Token'

declare global {
	interface SwapParams {
		tokenIn: Token
		tokenOut: Token
		amountIn: bigint
		slippage?: bigint // in basis points (e.g., 50 = 0.5%)
	}

	interface PoolImmutables {
		token0: Token
		token1: Token
		fee: number
		tickSpacing: number
		factory: Address
	}

	interface PoolPeriphery {
		quoter: Address
		router: Address
	}

	interface UniV2PoolPeriphery {
		router: Address
	}

	/**
	 * @param quoter - address of the quoter contract (both v1 and v2 have same interface)
	 * @param router - address of the router contract (preferably regular SwapRouter)
	 * @param is02Router - is used to determine if the router is SwapRouter02
	 */
	interface UniV3PoolPeriphery {
		quoter: Address
		router: Address
		is02Router?: boolean
	}

	interface V3PoolConfig {
		type: 'v3-like'
		abi: Abi
		slotFunction: string // 'slot0' or 'globalState'
		sqrtPriceX96Index: number // index in slot0/globalState result for sqrtPriceX96
		feeFunction: string
		tickSpacingFunction: string
	}

	interface V2PoolConfig {
		type: 'v2-like'
		abi: Abi
		defaultFee: number // basis points
	}

	type PoolConfig = V3PoolConfig | V2PoolConfig

	type SimulateRequestWithAccount = SimulateContractReturnType['request'] & {
		account: Account
	}
}
