import { Edge } from '../../domain/entities/edge'
import { Node } from '../../domain/entities/node'
import { EdgeExecutor } from './edge-executor'
import { EdgeQuoter } from './edge-quoter'
import { EdgeSnapshotBuilder } from './edge-snapshot-builder'

export interface GraphPlugin {
	findPossibleNodes?(): Promise<Node[]>

	findPossibleEdges?(nodes: Node[]): Promise<Edge[]>

	getDeterminedNodesAndEdges?(): Promise<{ nodes: Node[]; edges: Edge[] }>
}

export interface EdgeHandlerPlugin {
	canHandle(edge: Edge): boolean | Promise<boolean>
}

export interface SnapshotPlugin extends EdgeHandlerPlugin {
	buildEdgeSnapshotBuilder(
		edge: Edge,
	): EdgeSnapshotBuilder | Promise<EdgeSnapshotBuilder>
}

export interface ExecutorPlugin extends EdgeHandlerPlugin {
	buildEdgeExecutor(edge: Edge): EdgeExecutor | Promise<EdgeExecutor>
}

export interface QuoterPlugin extends EdgeHandlerPlugin {
	buildEdgeQuoter(edge: Edge): EdgeQuoter | Promise<EdgeQuoter>
}
