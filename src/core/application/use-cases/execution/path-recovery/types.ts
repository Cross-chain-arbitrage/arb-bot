import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import {
	FailedPathExecutionResult,
	SuccessPathExecutionResult,
} from '../path-executor/types'

export type PathRecoveryParams = {
	failedStepIndex: number
	stepAmountIn: bigint
	originalPath: QuotedPath<Token>
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
