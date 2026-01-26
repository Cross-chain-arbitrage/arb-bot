import { TransactionReceipt } from 'viem'
import { TokenBase } from '../evm/primitives/tokens/TokenBase'

export interface SuccessSwapResult {
	status: 'success'
	receipt: TransactionReceipt
	amountOut: bigint
}

export interface FailedSwapResult {
	status: 'reverted'
	receipt: TransactionReceipt
}

export type SwapResult = SuccessSwapResult | FailedSwapResult

export type QuoteParams = {
	tokenIn: TokenBase
	tokenOut: TokenBase
	amountIn: bigint
	slippage?: bigint
	enableSimulation?: boolean
}

export type SwapParams = {
	tokenIn: TokenBase
	tokenOut: TokenBase
	amountIn: bigint
	slippage?: bigint
}
