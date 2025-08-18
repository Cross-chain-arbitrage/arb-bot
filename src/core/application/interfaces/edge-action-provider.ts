import { Edge, EdgeId } from '../../domain/entities/edge'

export type ConfirmingResult = {
	amountOut: bigint
	getExecutionCost: () => Promise<GettingExecutionCostResult>
}

export type GettingExecutionCostResult = {
	costInUsd: number
}

export type ExecutingResult = {
	actionId: string
	confirm: () => Promise<ConfirmingResult>
}

export interface EdgeActionProvider {
	edge: Edge
	execute(amountIn: bigint): Promise<ExecutingResult>
}

export interface EdgeActionProviderRegistry {
	[edgeId: EdgeId]: EdgeActionProvider
}
