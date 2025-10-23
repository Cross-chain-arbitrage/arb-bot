import { Edge } from '../../../../domain/entities/edge'
import { Token } from '../../../../domain/entities/token'
import { Path } from '../../../../domain/value-objects/path'
import { StepExecutionResult } from '../step-executor/types'

export type PathExecutorParams = {
	path: Path<Token>
}

export type ProcessedStep = {
	edge: Edge
	stepIndex: number
	stepExecutionResults: StepExecutionResult[]
} & (
	| { status: 'success'; amountOut: bigint }
	| { status: 'failed'; reason: string }
)

export type SuccessPathExecutionResult = {
	processedSteps: ProcessedStep[]
	actualEndAmount: bigint
	status: 'success'
	totalExecutionCostInUsd: number
}

export type FailedPathExecutionResult = {
	processedSteps: ProcessedStep[]
	status: 'failed'
	totalExecutionCostInUsd: number
	stepIndex: number
	stepAmountIn: bigint
	reason: string
	failureType: 'validation' | 'execution'
}

export type PathExecutionResult =
	| SuccessPathExecutionResult
	| FailedPathExecutionResult

export type ValidateStep = (
	params: PathExecutorParams,
	stepIndex: number,
	amountIn: bigint,
) => Promise<{ isValid: true } | { isValid: false; reason: string }>
