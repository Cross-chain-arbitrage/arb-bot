import { Graph } from '../entities/graph'
import { EdgeId } from './edge-id'
import { Quote } from './quote'

export interface GraphSnapshot {
	graph: Graph
	getQuote(edgeId: EdgeId, amountIn: bigint): Quote
}
