import { Edge } from '../entities/edge'
import { Node } from '../entities/node'
import { Quote } from './quote'

export type QuotedStep<NodeType = Node> = { edge: Edge<NodeType>; quote: Quote }
export type QuotedPath<NodeType = Node> = QuotedStep<NodeType>[]

export interface ArbitrageCycle<NodeType = Node> {
	quotedPath: QuotedPath<NodeType>
	startAmount: bigint
	endAmount: bigint
}
