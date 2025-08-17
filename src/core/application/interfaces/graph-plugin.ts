import { Edge } from '../../domain/entities/edge'
import { Node } from '../../domain/entities/node'
import { Quote } from '../../domain/value-objects/weighted-graph-snapshot'

export interface GraphPlugin<C = unknown> {
	readonly name: string

	discoverNodes?(): Promise<Node[]>

	buildEdges?(nodes: Node[]): Promise<Edge[]>

	applyManual(): Promise<{ nodes: Node[]; edges: Edge[] }>

	//TODO: think about naming: first function (from plugin) build second function that build function for using in snapshot
	buildQuoteFn(edge: Edge): () => Promise<(amountIn: bigint) => Quote>
}
