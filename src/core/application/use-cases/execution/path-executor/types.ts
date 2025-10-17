import { Edge } from '../../../../domain/entities/edge'
import { Confirmation, Execution } from '../../../interfaces/edge-executor'

export interface PathExecutorParams {
	path: Edge[]
	startAmount: bigint
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
