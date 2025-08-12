import { Edge } from '../edge'

export abstract class InchainEdge extends Edge {
	abstract override execute(
		amountIn: bigint,
	): Promise<InchainEdgeExecutionResult>
}
