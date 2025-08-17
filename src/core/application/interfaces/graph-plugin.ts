import { Edge } from '../../domain/entities/edge'
import { Node } from '../../domain/entities/node'
import { EdgeQuoteProvider } from './edge-quote-provider'

export interface GraphBuilderPlugin {
	readonly name: string

	findPossibleNodes?(): Promise<Node[]>

	findPossibleEdges?(nodes: Node[]): Promise<Edge[]>

	getDeterminedNodesAndEdges?(): Promise<{ nodes: Node[]; edges: Edge[] }>
}

export interface GraphQuoteProviderPlugin {
	buildEdgeQuoteProvider(edge: Edge): EdgeQuoteProvider
}
