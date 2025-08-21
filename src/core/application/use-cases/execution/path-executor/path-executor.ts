import { Inject, Injectable } from '@nestjs/common'
import { Step } from '../../../../domain/services/bellman-ford'
import {
	Confirmation,
	EdgeExecutorRegistry,
	Execution,
} from '../../../interfaces/edge-executor'
import { PathExecutorParams } from './types'

const EDGE_ACTION_PROVIDER_REGISTRY_TOKEN = Symbol(
	'EDGE_ACTION_PROVIDER_REGISTRY_TOKEN',
)

@Injectable()
export class PathExecutor {
	constructor(
		@Inject(EDGE_ACTION_PROVIDER_REGISTRY_TOKEN)
		private readonly edgeActionProviderRegistry: EdgeExecutorRegistry,
	) {}

	async executePath(params: PathExecutorParams) {
		let nextAmountIn = params.startAmount
		let totalExecutionCostInUsd = 0

		for (const step of params.path) {
			const executionResult = await this.executeEdge(
				params,
				step,
				nextAmountIn,
			)

			const confirmationResult = await this.confirmEdge(
				params,
				step,
				executionResult,
			)

			const executionCostResult = await this.getExecutionCostEdge(
				params,
				step,
				confirmationResult,
			)

			totalExecutionCostInUsd += executionCostResult.costInUsd

			nextAmountIn = confirmationResult.amountOut
		}

		return {
			actualEndAmount: nextAmountIn,
			totalExecutionCostInUsd,
		}
	}

	private async executeEdge(
		params: PathExecutorParams,
		step: Step,
		nextAmountIn: bigint,
	) {
		const actionProvider = this.edgeActionProviderRegistry[step.edge.id]

		params.beforeExecuteEdgeHook?.(params.path, step, nextAmountIn)

		const executionResult = params.executeWrapper
			? await params.executeWrapper(
					actionProvider.execute.bind(actionProvider),
				)
			: await actionProvider.execute(nextAmountIn)

		params.afterExecuteEdgeHook?.(params.path, step, nextAmountIn)

		return executionResult
	}

	private async confirmEdge(
		params: PathExecutorParams,
		step: Step,
		executingResult: Execution,
	) {
		const actionProvider = this.edgeActionProviderRegistry[step.edge.id]

		params.beforeConfirmEdgeHook?.(params.path, step)

		const confirmationResult = params.confirmWrapper
			? await params.confirmWrapper(
					executingResult.confirm.bind(actionProvider),
				)
			: await executingResult.confirm()

		params.afterConfirmEdgeHook?.(
			params.path,
			step,
			confirmationResult.amountOut,
		)

		return confirmationResult
	}

	private async getExecutionCostEdge(
		params: PathExecutorParams,
		step: Step,
		confirmingResult: Confirmation,
	) {
		const actionProvider = this.edgeActionProviderRegistry[step.edge.id]

		params.beforeGetExecutionCostHook?.(params.path, step)

		const executionCostResult = params.getExecutionCostWrapper
			? await params.getExecutionCostWrapper(
					confirmingResult.getExecutionCost.bind(actionProvider),
				)
			: await confirmingResult.getExecutionCost()

		params.afterGetExecutionCostHook?.(
			params.path,
			step,
			executionCostResult.costInUsd,
		)

		return executionCostResult
	}
}
