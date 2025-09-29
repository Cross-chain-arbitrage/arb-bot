import { TokenId } from '../../../../domain/value-objects/token-id'
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

export interface StartRule {
	startTokenId: TokenId
	directionTokenId: TokenId
}
export interface ArbitrageExecutorConfig {
	startRules: StartRule[]
}
