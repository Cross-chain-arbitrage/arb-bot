import { Injectable } from '@nestjs/common'
import { withRetry } from 'viem'
import { wait } from '../../../../../utils/common'
import { Edge } from '../../../../domain/entities/edge'
import { StepExecutor } from '../step-executor/step-executor'
import { backoffMs } from '../utils/backoff'
import { PathExecutionTelemetry } from './path-execution-telemetry'
import {
	FailedPathExecutionResult,
	PathExecutionResult,
	PathExecutorParams,
	StepProcessingResult,
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
		let stepResults: StepProcessingResult[] = []
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
					await this.getTotalCostInUsd(stepResults),
					'validation',
				)
			}

			const result = await this.processStepWithRetry(
				step.edge,
				stepIndex,
				nextAmountIn,
				{
					maxAttempts: 2,
				},
			)

			if (result.status === 'failed') {
				return this.buildFailedResult(
					stepIndex,
					nextAmountIn,
					result.reason,
					await this.getTotalCostInUsd(stepResults),
					'execution',
				)
			}

			nextAmountIn = result.amountOut
			stepResults = [...stepResults, ...result.stepResults]
		}

		return {
			actualEndAmount: nextAmountIn,
			totalExecutionCostInUsd: await this.getTotalCostInUsd(stepResults),
			status: 'success',
		}
	}

	private async getTotalCostInUsd(stepResults: StepProcessingResult[]) {
		let totalCostInUsd = 0

		for (const stepResult of stepResults) {
			try {
				const { costInUsd } =
					await stepResult.confirmation.getExecutionCost()

				totalCostInUsd += costInUsd

				this.telemetry.onStepCostSuccess(stepResult, costInUsd)
			} catch (error) {
				this.telemetry.onStepCostFailure(
					stepResult,
					error instanceof Error ? error : new Error('Unknown error'),
				)
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
	): FailedPathExecutionResult {
		return {
			totalExecutionCostInUsd,
			status: 'failed',
			reason: failureReason,
			stepIndex,
			stepAmountIn: amountIn,
			failureType,
		}
	}

	async processStepWithRetry(
		edge: Edge,
		stepIndex: number,
		amountIn: bigint,
		policy: { maxAttempts: number; backoffMs?: (n: number) => number },
	) {
		const stepResults: StepProcessingResult[] = []
		let lastReason: string = 'last reason does not exist'

		try {
			for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
				const stepResult = await this.processStep(
					edge,
					stepIndex,
					amountIn,
					attempt,
				)

				stepResults.push(stepResult)

				if (stepResult.confirmation.status === 'success')
					return {
						status: 'success',
						amountOut: stepResult.confirmation.amountOut,
						stepResults,
					} as const

				lastReason = stepResult.confirmation.reason

				await wait(policy.backoffMs?.(attempt) ?? backoffMs(attempt))
			}
		} catch (error) {
			return {
				status: 'failed',
				reason:
					error instanceof Error ? error.message : 'Unknown error',
				stepResults,
			} as const
		}

		return {
			status: 'failed',
			reason: lastReason,
			stepResults,
		} as const
	}

	async processStep(
		edge: Edge,
		stepIndex: number,
		amountIn: bigint,
		attempt: number,
	): Promise<StepProcessingResult> {
		this.telemetry.onProcessStepStart(edge, amountIn, attempt)

		const { confirmation, execution } = await this.stepExecutor.executeStep(
			edge,
			amountIn,
		)

		if (confirmation.status === 'success') {
			this.telemetry.onProcessStepSuccess(
				edge,
				confirmation.amountOut,
				attempt,
			)

			return { confirmation, execution, edge, stepIndex, attempt }
		}

		this.telemetry.onProcessStepFailure(edge, confirmation.reason, attempt)

		return { confirmation, execution, edge, stepIndex, attempt }
	}
}
