import { Edge } from '../entities/edge'
import { Node } from '../entities/node'
import { Quote } from './quote'

export type Step<NodeType = Node> = {
	edge: Edge<NodeType>
}

export type Path<NodeType = Node> = {
	stepSequence: Step<NodeType>[]
	startAmount: bigint
}

export type QuotedStep<NodeType = Node> = Step<NodeType> & { quote: Quote }

export type QuotedPath<NodeType = Node> = {
	quotedStepSequence: QuotedStep<NodeType>[]
	startAmount: bigint
	endAmount: bigint
}
