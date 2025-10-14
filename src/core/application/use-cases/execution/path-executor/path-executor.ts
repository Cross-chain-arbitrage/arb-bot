import { Injectable } from '@nestjs/common'
import { withRetry } from 'viem'
import { wait } from '../../../../../utils/common'
import { Step } from '../../../../domain/services/bellman-ford'
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
		let nextAmountIn = params.startAmount

		for (const step of params.path) {
			const validationResult = validateStep
				? await withRetry(() =>
						validateStep(params, step, nextAmountIn),
					)
				: undefined

			if (validationResult?.isValid === false) {
				return this.buildFailedResult(
					step,
					nextAmountIn,
					validationResult.reason,
					await this.getTotalCostInUsd(stepResults),
				)
			}

			const result = await this.processStepWithRetry(step, nextAmountIn, {
				maxAttempts: 2,
			})

			if (result.status === 'failed') {
				return this.buildFailedResult(
					step,
					nextAmountIn,
					result.reason,
					await this.getTotalCostInUsd(stepResults),
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
		step: Step,
		amountIn: bigint,
		failureReason: string,
		totalExecutionCostInUsd: number,
	): FailedPathExecutionResult {
		return {
			totalExecutionCostInUsd,
			status: 'failed',
			reason: failureReason,
			step,
			stepAmountIn: amountIn,
		}
	}

	async processStepWithRetry(
		step: Step,
		amountIn: bigint,
		policy: { maxAttempts: number; backoffMs?: (n: number) => number },
	) {
		const stepResults: StepProcessingResult[] = []
		let lastReason: string = 'last reason does not exist'

		try {
			for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
				const stepResult = await this.processStep(
					step,
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
		step: Step,
		amountIn: bigint,
		attempt: number,
	): Promise<StepProcessingResult> {
		this.telemetry.onProcessStepStart(step.edge, amountIn, attempt)

		const { confirmation, execution } = await this.stepExecutor.executeStep(
			step,
			amountIn,
		)

		if (confirmation.status === 'success') {
			this.telemetry.onProcessStepSuccess(
				step.edge,
				confirmation.amountOut,
				attempt,
			)

			return { confirmation, execution, step, attempt }
		}

		this.telemetry.onProcessStepFailure(
			step.edge,
			confirmation.reason,
			attempt,
		)

		return { confirmation, execution, step, attempt }
	}
}
