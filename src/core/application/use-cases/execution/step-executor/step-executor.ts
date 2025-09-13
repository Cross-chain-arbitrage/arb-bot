import { Inject, Injectable } from '@nestjs/common'
import { wait } from '../../../../../utils/common'
import { Step } from '../../../../domain/services/bellman-ford'
import {
	Confirmation,
	EDGE_EXECUTOR_REGISTRY_TOKEN,
	EdgeExecutor,
	EdgeExecutorRegistry,
	Execution,
	ExecutionCost,
} from '../../../interfaces/edge-executor'
import { backoffMs } from '../utils/backoff'
import { StepExecutionTelemetry } from './step-execution-telemetry'

@Injectable()
export class StepExecutor {
	constructor(
		@Inject(EDGE_EXECUTOR_REGISTRY_TOKEN)
		private readonly edgeExecutorRegistry: EdgeExecutorRegistry,
		private readonly telemetry: StepExecutionTelemetry,
	) {}

	async executeStep(step: Step, amountIn: bigint) {
		const edgeExecutor = this.edgeExecutorRegistry.get(step.edge.id)

		if (!edgeExecutor) {
			throw new Error(`Edge executor not found for edge ${step.edge.id}`)
		}

		const execution = await this.executeWithRetry(edgeExecutor, amountIn)

		const confirmation = await this.confirmWithRetry(execution)

		const executionCost = await this.getExecutionCostWithRetry(confirmation)

		return {
			execution,
			confirmation,
			executionCost,
		}
	}

	async executeWithRetry(edgeExecutor: EdgeExecutor, amountIn: bigint) {
		return this.retryPhase<Execution>(
			() => edgeExecutor.execute(amountIn),
			{
				maxAttempts: 2,
			},
			'edge_execution',
		)
	}

	async confirmWithRetry(execution: Execution) {
		return this.retryPhase<Confirmation>(
			() => execution.confirm(),
			{
				maxAttempts: 3,
			},
			'confirmation',
		)
	}

	async getExecutionCostWithRetry(confirmation: Confirmation) {
		return this.retryPhase<ExecutionCost>(
			() => confirmation.getExecutionCost(),
			{
				maxAttempts: 2,
			},
			'cost_calculation',
		)
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

				await wait(policy.backoffMs?.(attempt) ?? backoffMs(attempt))
			}
		}
		throw new Error('unreachable')
	}
}
