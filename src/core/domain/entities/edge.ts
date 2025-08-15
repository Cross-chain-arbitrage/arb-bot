import { Node } from './node'

export type EdgeId = string

export type Quote = {
	rate: number // negative log of exchange rate
	amountOut: bigint
}

export interface Edge {
	id: EdgeId
	from: Node
	to: Node

	getQuote(amountIn: bigint): Quote
}
