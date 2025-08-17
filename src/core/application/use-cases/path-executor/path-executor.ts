import { Inject, Injectable } from '@nestjs/common'
import { EdgeActionProviderRegistry } from '../../interfaces/edge-action-provider'
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

		for (const { edge } of params.path) {
			const actionProvider = this.edgeActionProviderRegistry[edge.id]

			const { actionId } = await actionProvider.execute(nextAmountIn)

			const { amountOut } = await actionProvider.confirm(actionId)

			nextAmountIn = amountOut
		}
	}
}
