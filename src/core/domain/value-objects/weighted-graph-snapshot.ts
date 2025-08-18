import { EdgeId } from '../entities/edge'
import { Graph } from '../entities/graph'

export type Quote = {
	rate: number // negative log of exchange rate
	amountOut: bigint
	executionCostInUsd: number
}

export interface GraphSnapshot {
	graph: Graph
	getQuote(edgeId: EdgeId, amountIn: bigint): Quote
}
