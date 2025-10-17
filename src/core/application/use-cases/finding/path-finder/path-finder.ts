import { Inject, Injectable } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { BellmanFord } from '../../../../domain/services/bellman-ford'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'
import { GraphSnapshotBuilder } from '../graph-snapshot-builder/gpaph-snapshot-builder'

@Injectable()
export class PathFinder {
	constructor(
		private readonly graphSnapshotBuilder: GraphSnapshotBuilder,
		@Inject(GRAPH_TOKEN) private readonly graph: Graph<Token>,
	) {}

	async findPath(
		startToken: Token,
		endToken: Token,
		startAmount: bigint,
	): Promise<QuotedPath | null> {
		if (startToken.id === endToken.id) {
			return {
				quotedStepSequence: [],
				startAmount,
				endAmount: startAmount,
			}
		}

		const graphSnapshot = await this.graphSnapshotBuilder.buildSnapshot(
			this.graph,
		)

		const path = BellmanFord.findPath(
			startToken,
			endToken,
			startAmount,
			graphSnapshot,
		)

		return path
	}
}
