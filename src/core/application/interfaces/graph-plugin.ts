import { Edge } from '../../domain/entities/edge'
import { Node } from '../../domain/entities/node'
import { EdgeActionProvider } from './edge-action-provider'
import { EdgeQuoteProvider } from './edge-quote-provider'

export interface GraphPlugin {
	name: string
}

export interface GraphBuilderPlugin extends GraphPlugin {
	findPossibleNodes?(): Promise<Node[]>

	findPossibleEdges?(nodes: Node[]): Promise<Edge[]>

	getDeterminedNodesAndEdges?(): Promise<{ nodes: Node[]; edges: Edge[] }>
}

export interface GraphQuoteProviderPlugin extends GraphPlugin {
	buildEdgeQuoteProvider(edge: Edge): EdgeQuoteProvider
}

export interface GraphActionProviderPlugin extends GraphPlugin {
	buildEdgeActionProvider(edge: Edge): EdgeActionProvider
}
