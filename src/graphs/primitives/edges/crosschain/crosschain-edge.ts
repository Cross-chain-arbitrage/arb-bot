import { Edge } from '../edge'

export abstract class CrosschainEdge extends Edge {
	abstract override execute(
		amountIn: bigint,
	): Promise<CrosschainEdgeExecutionResult>
}
