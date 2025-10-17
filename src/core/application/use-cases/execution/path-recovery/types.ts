import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { TokenId } from '../../../../domain/value-objects/token-id'
import {
	FailedPathExecutionResult,
	SuccessPathExecutionResult,
} from '../path-executor/types'

export type PathRecoveryParams = {
	failedStepIndex: number
	originalPath: QuotedPath<Token>
	minTokenThresholds: Map<TokenId, number>
}

export type PathRecoveryFailedResult = {
	status: 'failed'
	reason: string
} & (
	| {
			failureType: 'execution'
			pathExecutionResult: FailedPathExecutionResult
			path: QuotedPath<Token>
	  }
	| {
			failureType: 'preparation'
	  }
)

export type PathRecoverySuccessResult = {
	status: 'success'
	pathExecutionResult: SuccessPathExecutionResult
	path: QuotedPath<Token>
}

export type PathRecoveryResult =
	| PathRecoveryFailedResult
	| PathRecoverySuccessResult
