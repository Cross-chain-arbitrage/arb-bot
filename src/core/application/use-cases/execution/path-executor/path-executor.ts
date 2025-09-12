import { Injectable } from '@nestjs/common'
import { Step } from '../../../../domain/services/bellman-ford'
import { StepExecutor } from '../step-executor/step-executor'
import { PathExecutionTelemetry } from './path-execution-telemetry'
import {
	FailedPathExecutionResult,
	PathExecutorParams,
	SuccessPathExecutionResult,
} from './types'

@Injectable()
export class PathExecutor {
	constructor(
		private readonly telemetry: PathExecutionTelemetry,
		private readonly stepExecutor: StepExecutor,
	) {}

	async executePath(
		params: PathExecutorParams,
	): Promise<SuccessPathExecutionResult | FailedPathExecutionResult> {
		let nextAmountIn = params.startAmount
		let totalExecutionCostInUsd = 0

		for (const step of params.path) {
			try {
				const result = await this.processStep(step, nextAmountIn)

				totalExecutionCostInUsd += result.executionCostInUsd

				if (result.status === 'success') {
					nextAmountIn = result.amountOut
				} else {
					return this.buildFailedResult(
						step,
						nextAmountIn,
						result.failureReason,
						totalExecutionCostInUsd,
					)
				}
			} catch (error) {
				return this.buildFailedResult(
					step,
					nextAmountIn,
					error instanceof Error
						? error.message
						: `Unknown error, ${String(error)}`,
					totalExecutionCostInUsd,
				)
			}
		}

		return {
			actualEndAmount: nextAmountIn,
			totalExecutionCostInUsd,
			status: 'success',
		}
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

	async processStep(step: Step, amountIn: bigint) {
		this.telemetry.onProcessStepStart(step.edge, amountIn)

		const { confirmation, executionCost } =
			await this.stepExecutor.executeStep(step, amountIn)

		if (confirmation.status === 'success') {
			this.telemetry.onProcessStepSuccess(
				step.edge,
				confirmation.amountOut,
				executionCost.costInUsd,
			)

			return {
				status: 'success',
				amountOut: confirmation.amountOut,
				executionCostInUsd: executionCost.costInUsd,
			} as const
		} else {
			this.telemetry.onProcessStepFailure(step.edge, confirmation.reason)

			return {
				status: 'failed',
				failureReason: confirmation.reason,
				executionCostInUsd: executionCost.costInUsd,
			} as const
		}
	}
}
