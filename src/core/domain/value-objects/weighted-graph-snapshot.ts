import { Graph } from '../entities/graph'

export type Quote = {
	rate: number // negative log of exchange rate
	amountOut: bigint
	executionCostInUsd: number
}

export interface GraphSnapshot {
	graph: Graph
	getQuote(edgeId: string, amountIn: bigint): Quote
}
