import { Edge, EdgeId } from '../../domain/entities/edge'

export interface EdgeActionProvider {
	edge: Edge
	execute(amountIn: bigint): Promise<{ actionId: string }>
	confirm(actionId: string): Promise<{ amountOut: bigint }>
}

export interface EdgeActionProviderRegistry {
	[edgeId: EdgeId]: EdgeActionProvider
}
