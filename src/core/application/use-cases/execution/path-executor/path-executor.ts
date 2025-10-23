import { Injectable } from '@nestjs/common'
import { withRetry } from 'viem'
import { wait } from '../../../../../utils/common'
import { Edge } from '../../../../domain/entities/edge'
import { StepExecutor } from '../step-executor/step-executor'
import { StepExecutionResult } from '../step-executor/types'
import { backoffMs } from '../utils/backoff'
import { PathExecutionTelemetry } from './path-execution-telemetry'
import {
	FailedPathExecutionResult,
	PathExecutionResult,
	PathExecutorParams,
	ProcessedStep,
	ValidateStep,
} from './types'

@Injectable()
export class PathExecutor {
	constructor(
		private readonly telemetry: PathExecutionTelemetry,
		private readonly stepExecutor: StepExecutor,
	) {}

	async executePath(
		params: PathExecutorParams,
		validateStep?: ValidateStep,
	): Promise<PathExecutionResult> {
		const processedSteps: ProcessedStep[] = []
		let nextAmountIn = params.path.startAmount

		for (const [stepIndex, step] of params.path.stepSequence.entries()) {
			const validationResult = validateStep
				? await withRetry(() =>
						validateStep(params, stepIndex, nextAmountIn),
					)
				: undefined

			if (validationResult?.isValid === false) {
				return this.buildFailedResult(
					stepIndex,
					nextAmountIn,
					validationResult.reason,
					await this.getTotalCostInUsd(processedSteps),
					'validation',
					processedSteps,
				)
			}

			const processedStep = await this.processStep(
				step.edge,
				stepIndex,
				nextAmountIn,
				{
					maxAttempts: 2,
				},
			)

			processedSteps.push(processedStep)

			if (processedStep.status === 'failed') {
				return this.buildFailedResult(
					stepIndex,
					nextAmountIn,
					processedStep.reason,
					await this.getTotalCostInUsd(processedSteps),
					'execution',
					processedSteps,
				)
			}

			nextAmountIn = processedStep.amountOut
		}

		return {
			actualEndAmount: nextAmountIn,
			totalExecutionCostInUsd:
				await this.getTotalCostInUsd(processedSteps),
			status: 'success',
			processedSteps,
		}
	}

	private async getTotalCostInUsd(processedSteps: ProcessedStep[]) {
		let totalCostInUsd = 0

		for (const processedStep of processedSteps) {
			for (const [
				stepExecutionAttempt,
				stepExecutionResult,
			] of processedStep.stepExecutionResults.entries()) {
				try {
					const { costInUsd } =
						await stepExecutionResult.confirmation.getExecutionCost()

					totalCostInUsd += costInUsd

					this.telemetry.onStepCostSuccess(
						processedStep,
						stepExecutionAttempt,
						costInUsd,
					)
				} catch (error) {
					this.telemetry.onStepCostFailure(
						processedStep,
						stepExecutionAttempt,
						error instanceof Error
							? error
							: new Error('Unknown error'),
					)
				}
			}
		}

		return totalCostInUsd
	}

	private buildFailedResult(
		stepIndex: number,
		amountIn: bigint,
		failureReason: string,
		totalExecutionCostInUsd: number,
		failureType: 'validation' | 'execution',
		processedSteps: ProcessedStep[],
	): FailedPathExecutionResult {
		return {
			totalExecutionCostInUsd,
			status: 'failed',
			reason: failureReason,
			stepIndex,
			stepAmountIn: amountIn,
			failureType,
			processedSteps,
		}
	}

	async processStep(
		edge: Edge,
		stepIndex: number,
		amountIn: bigint,
		policy: { maxAttempts: number; backoffMs?: (n: number) => number },
	): Promise<ProcessedStep> {
		const stepExecutionResults: StepExecutionResult[] = []
		let lastReason: string = 'last reason does not exist'

		try {
			for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
				const stepExecutionResult = await this.executeStep(
					edge,
					amountIn,
					attempt,
				)

				stepExecutionResults.push(stepExecutionResult)

				if (stepExecutionResult.confirmation.status === 'success')
					return {
						status: 'success',
						amountOut: stepExecutionResult.confirmation.amountOut,
						stepExecutionResults,
						edge,
						stepIndex,
					}

				lastReason = stepExecutionResult.confirmation.reason

				await wait(policy.backoffMs?.(attempt) ?? backoffMs(attempt))
			}
		} catch (error) {
			return {
				status: 'failed',
				reason:
					error instanceof Error ? error.message : 'Unknown error',
				stepExecutionResults,
				edge,
				stepIndex,
			}
		}

		return {
			status: 'failed',
			reason: lastReason,
			stepExecutionResults,
			edge,
			stepIndex,
		}
	}

	async executeStep(
		edge: Edge,
		amountIn: bigint,
		attempt: number,
	): Promise<StepExecutionResult> {
		this.telemetry.onProcessStepStart(edge, amountIn, attempt)

		const stepExecutionResult = await this.stepExecutor.executeStep(
			edge,
			amountIn,
		)

		if (stepExecutionResult.confirmation.status === 'success') {
			this.telemetry.onProcessStepSuccess(
				edge,
				stepExecutionResult.confirmation.amountOut,
				attempt,
			)

			return stepExecutionResult
		}

		this.telemetry.onProcessStepFailure(
			edge,
			stepExecutionResult.confirmation.reason,
			attempt,
		)

		return stepExecutionResult
	}
}
