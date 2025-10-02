import { TransactionReceipt } from 'viem'

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
