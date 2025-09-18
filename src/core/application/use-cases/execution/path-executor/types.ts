import { Path, Step } from '../../../../domain/services/bellman-ford'

export interface PathExecutorParams {
	path: Path
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
	step: Step
	stepAmountIn: bigint
	reason: string
}

export type PathExecutionResult =
	| SuccessPathExecutionResult
	| FailedPathExecutionResult

export type ValidateStep = (
	params: PathExecutorParams,
	step: Step,
	amountIn: bigint,
) => Promise<{ isValid: true } | { isValid: false; reason: string }>
