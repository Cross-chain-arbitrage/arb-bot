import {
	FailedPathExecutionResult,
	SuccessPathExecutionResult,
} from '../path-executor/types'

export type SuccessArbitrageResult = SuccessPathExecutionResult & {
	profitInUsd: number
	revenueInUsd: number
}

export type FailedArbitrageResult = FailedPathExecutionResult & {}

export type ArbitrageResult = SuccessArbitrageResult | FailedArbitrageResult
