import { Edge } from '../../../../domain/entities/edge'
import { Token } from '../../../../domain/entities/token'
import { Path } from '../../../../domain/value-objects/path'
import { Confirmation, Execution } from '../../../interfaces/edge-executor'

export type PathExecutorParams = {
	path: Path<Token>
}

export interface SuccessPathExecutionResult {
	actualEndAmount: bigint
	status: 'success'
	totalExecutionCostInUsd: number
}

export interface FailedPathExecutionResult {
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

export type StepProcessingResult = {
	edge: Edge
	stepIndex: number
	confirmation: Confirmation
	execution: Execution
	attempt: number
}
