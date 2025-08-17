import { Inject, Injectable } from '@nestjs/common'
import {
	EdgeActionProvider,
	EdgeActionProviderRegistry,
} from '../../interfaces/edge-action-provider'
import { PathExecutorParams } from './types'

const EDGE_ACTION_PROVIDER_REGISTRY_TOKEN = Symbol(
	'EDGE_ACTION_PROVIDER_REGISTRY_TOKEN',
)

@Injectable()
export class PathExecutor {
	constructor(
		@Inject(EDGE_ACTION_PROVIDER_REGISTRY_TOKEN)
		private readonly edgeActionProviderRegistry: EdgeActionProviderRegistry,
	) {}

	async executePath(params: PathExecutorParams) {
		let nextAmountIn = params.startAmount
		let totalExecutionCostInUsd = 0

		for (const { edge } of params.path) {
			const actionProvider = this.edgeActionProviderRegistry[edge.id]

			const executionResult = await this.executeEdge(
				params,
				actionProvider,
				nextAmountIn,
			)

			const confirmationResult = await this.confirmEdge(
				params,
				actionProvider,
				executionResult,
			)

			const executionCostResult = await this.getExecutionCostEdge(
				params,
				actionProvider,
				executionResult,
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
		actionProvider: EdgeActionProvider,
		nextAmountIn: bigint,
	) {
		const executionResult = params.executeWrapper
			? await params.executeWrapper(
					actionProvider.execute.bind(actionProvider),
				)
			: await actionProvider.execute(nextAmountIn)

		return executionResult
	}

	private async confirmEdge(
		params: PathExecutorParams,
		actionProvider: EdgeActionProvider,
		executionResult: Awaited<ReturnType<EdgeActionProvider['execute']>>,
	) {
		const confirmationResult = params.confirmWrapper
			? await params.confirmWrapper(
					actionProvider.confirm.bind(actionProvider),
				)
			: await actionProvider.confirm(executionResult.actionId)

		return confirmationResult
	}

	private async getExecutionCostEdge(
		params: PathExecutorParams,
		actionProvider: EdgeActionProvider,
		executionResult: Awaited<ReturnType<EdgeActionProvider['execute']>>,
	) {
		const executionCostResult = params.getExecutionCostWrapper
			? await params.getExecutionCostWrapper(
					actionProvider.getExecutionCost.bind(actionProvider),
				)
			: await actionProvider.getExecutionCost(executionResult.actionId)

		return executionCostResult
	}
}
