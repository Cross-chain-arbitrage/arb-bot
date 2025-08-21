import { Edge } from '../../domain/entities/edge'
import { Node } from '../../domain/entities/node'
import { EdgeExecutor } from './edge-executor'
import { EdgeSnapshotBuilder } from './edge-snapshot-builder'

export interface Plugin {
	id: string
}

export interface GraphPlugin extends Plugin {
	findPossibleNodes?(): Promise<Node[]>

	findPossibleEdges?(nodes: Node[]): Promise<Edge[]>

	getDeterminedNodesAndEdges?(): Promise<{ nodes: Node[]; edges: Edge[] }>
}

export interface SnapshotPlugin extends Plugin {
	buildEdgeSnapshotBuilder(edge: Edge): EdgeSnapshotBuilder
}

export interface ExecutorPlugin extends Plugin {
	buildEdgeExecutor(edge: Edge): EdgeExecutor
}
