import { Inject, Injectable } from '@nestjs/common'
import { wait } from '../../../../../utils/common'
import { Edge } from '../../../../domain/entities/edge'
import {
	Confirmation,
	EXECUTORS_REGISTRY_TOKEN,
	EdgeExecutor,
	Execution,
	ExecutorsRegistry,
} from '../../../interfaces/edge-executor'
import { backoffMs } from '../utils/backoff'
import { StepExecutionTelemetry } from './step-execution-telemetry'
import { StepExecutionResult, StepPhase } from './types'

@Injectable()
export class StepExecutor {
	constructor(
		@Inject(EXECUTORS_REGISTRY_TOKEN)
		private readonly edgeExecutorRegistry: ExecutorsRegistry,
		private readonly telemetry: StepExecutionTelemetry,
	) {}

	async executeStep(
		edge: Edge,
		amountIn: bigint,
	): Promise<StepExecutionResult> {
		const edgeExecutor = this.edgeExecutorRegistry.get(edge.id)

		if (!edgeExecutor) {
			throw new Error(`Edge executor not found for edge ${edge.id}`)
		}

		const execution = await this.executeWithRetry(edgeExecutor, amountIn)

		const confirmation = await this.confirmWithRetry(execution)

		return {
			execution,
			confirmation,
		}
	}

	async executeWithRetry(edgeExecutor: EdgeExecutor, amountIn: bigint) {
		return this.retryPhase<Execution>(
			() => edgeExecutor.execute(amountIn),
			{
				maxAttempts: 4,
			},
			StepPhase.EXECUTE,
		)
	}

	async confirmWithRetry(execution: Execution) {
		return this.retryPhase<Confirmation>(
			() => execution.confirm(),
			{
				maxAttempts: 4,
			},
			StepPhase.CONFIRM,
		)
	}

	private async retryPhase<T>(
		fn: () => Promise<T>,
		policy: { maxAttempts: number; backoffMs?: (n: number) => number },
		phase: StepPhase,
	): Promise<T> {
		for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
			try {
				this.telemetry.onPhaseStart(phase, attempt)

				const res = await fn()

				this.telemetry.onPhaseSuccess(phase, attempt, res)

				return res
			} catch (err) {
				this.telemetry.onPhaseError(phase, attempt, err)

				if (attempt === policy.maxAttempts) throw err

				await wait(policy.backoffMs?.(attempt) ?? backoffMs(attempt))
			}
		}
		throw new Error('unreachable')
	}
}
