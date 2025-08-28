import { Inject, Injectable } from '@nestjs/common'
import { wait } from '../../../../../utils/common'
import { Step } from '../../../../domain/services/bellman-ford'
import {
	Confirmation,
	EdgeExecutorRegistry,
	Execution,
} from '../../../interfaces/edge-executor'
import { ExecutionTelemetry } from '../execution-telemetry/execution-telemetry'
import { PathExecutorParams } from './types'

export const EDGE_EXECUTOR_REGISTRY_TOKEN = Symbol(
	'EDGE_EXECUTOR_REGISTRY_TOKEN',
)
@Injectable()
export class PathExecutor {
	constructor(
		@Inject(EDGE_EXECUTOR_REGISTRY_TOKEN)
		private readonly edgeExecutorRegistry: EdgeExecutorRegistry,
		private readonly telemetry: ExecutionTelemetry,
	) {}

	async executePath(params: PathExecutorParams) {
		let nextAmountIn = params.startAmount
		let totalExecutionCostInUsd = 0

		for (const step of params.path) {
			const { amountOut, executionCostInUsd } = await this.processStep(
				step,
				nextAmountIn,
				{
					maxAttempts: 2,
				},
			)

			totalExecutionCostInUsd += executionCostInUsd
			nextAmountIn = amountOut
		}

		return {
			actualEndAmount: nextAmountIn,
			totalExecutionCostInUsd,
		}
	}

	async processStep(
		step: Step,
		amountIn: bigint,
		policy: { maxAttempts: number; backoffMs?: (n: number) => number },
	) {
		let amountOut: bigint | undefined
		let executionCostInUsd = 0
		let error: unknown

		for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
			this.telemetry.onProcessStepStart(step.edge, amountIn)

			const { confirmation, executionCost } = await this.executeStep(
				step,
				amountIn,
			)

			if (confirmation.status === 'success') {
				this.telemetry.onProcessStepSuccess(
					step.edge,
					confirmation.amountOut,
					executionCost.costInUsd,
				)
				amountOut = confirmation.amountOut
				executionCostInUsd += executionCost.costInUsd

				break
			} else {
				this.telemetry.onProcessStepFailure(
					step.edge,
					confirmation.reason,
				)
				executionCostInUsd += executionCost.costInUsd
				error = confirmation.reason

				if (attempt < policy.maxAttempts) {
					await wait(
						policy.backoffMs?.(attempt) ?? this.backoffMs(attempt),
					)
				}
			}
		}

		if (!amountOut) {
			if (error instanceof Error) {
				throw error
			} else {
				throw new Error(
					`Execution failed, reason: ${JSON.stringify(error)}`,
				)
			}
		}

		return {
			amountOut,
			executionCostInUsd,
		}
	}

	private async executeStep(step: Step, amountIn: bigint) {
		const edgeExecutor = this.edgeExecutorRegistry[step.edge.id]

		this.telemetry.onEdgeExecutionStart(step.edge, amountIn)

		const execution = await this.retryPhase<Execution>(
			() => edgeExecutor.execute(amountIn),
			{
				maxAttempts: 2,
			},
			'edge_execution',
		)

		const confirmation = await this.retryPhase<Confirmation>(
			() => execution.confirm(),
			{
				maxAttempts: 3,
			},
			'confirmation',
		)

		const executionCost = await this.retryPhase(
			() => confirmation.getExecutionCost(),
			{
				maxAttempts: 2,
			},
			'cost_calculation',
		)

		return {
			execution,
			confirmation,
			executionCost,
		}
	}

	private async retryPhase<T>(
		fn: () => Promise<T>,
		policy: { maxAttempts: number; backoffMs?: (n: number) => number },
		label: string,
	): Promise<T> {
		for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
			try {
				this.telemetry.onPhaseStart(label, attempt)
				const res = await fn()
				this.telemetry.onPhaseSuccess(label, attempt, res)
				return res
			} catch (err) {
				this.telemetry.onPhaseFailure(label, attempt, err)
				if (attempt === policy.maxAttempts) throw err

				await wait(
					policy.backoffMs?.(attempt) ?? this.backoffMs(attempt),
				)
			}
		}
		throw new Error('unreachable')
	}

	private backoffMs(attempt: number) {
		return 1000 * Math.pow(2, attempt)
	}
}
