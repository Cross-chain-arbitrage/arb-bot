import { TokenId } from '../../../../domain/value-objects/token-id'
import {
	FailedPathExecutionResult,
	SuccessPathExecutionResult,
} from '../path-executor/types'
import { PathRecoveryResult } from '../path-recovery/types'

export type SuccessArbitrageResult = {
	status: 'success'
	pathExecutionResult: SuccessPathExecutionResult
	profitInUsd: number
	revenueInUsd: number
	executionTime: number
}

export type FailedArbitrageResult = {
	status: 'failed'
	pathExecutionResult: FailedPathExecutionResult
	recoveryResult: PathRecoveryResult
	executionTime: number
}

export type ArbitrageResult = SuccessArbitrageResult | FailedArbitrageResult

export interface StartRule {
	startTokenId: TokenId
	directionTokenId: TokenId
}
export interface PathRecoveryConfig {
	enabled: boolean
	minTokenThresholds?: Array<{
		tokenId: TokenId
		threshold: number
	}>
}
export interface ArbitrageExecutorConfig {
	startRules?: StartRule[]
	pathRecoveryConfig: PathRecoveryConfig
}
