import {
	FailedPathExecutionResult,
	SuccessPathExecutionResult,
} from '../path-executor/types'

export type SuccessArbitrageResult = SuccessPathExecutionResult & {
	profitInUsd: number
	revenueInUsd: number
	executionTime: number
}

export type FailedArbitrageResult = FailedPathExecutionResult & {
	executionTime: number
}

export type ArbitrageResult = SuccessArbitrageResult | FailedArbitrageResult
