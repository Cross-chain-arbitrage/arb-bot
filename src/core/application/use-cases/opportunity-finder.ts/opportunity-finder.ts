import { Injectable } from '@nestjs/common'
import { Graph } from '../../../domain/entities/graph'
import { GraphSnapshotBuilder } from '../graph-snapshot-builder/gpaph-snapshot-builder'
import { SnapshotOpportunityFinder } from '../snapshot-opportunity-finder/snapshot-opportunity-finder'
import {
	GraphArbitrageOpportunity,
	SnapshotFindOpportunityParams,
} from '../snapshot-opportunity-finder/types'

@Injectable()
export class OpportunityFinder {
	constructor(
		private readonly snapshotOpportunityFinder: SnapshotOpportunityFinder,
		private readonly graphSnapshotBuilder: GraphSnapshotBuilder,
	) {}

	async findOpportunity(
		graph: Graph,
		snapshotFindOpportunityParams: SnapshotFindOpportunityParams,
	): Promise<GraphArbitrageOpportunity | null> {
		const graphSnapshot =
			await this.graphSnapshotBuilder.buildSnapshot(graph)

		return this.snapshotOpportunityFinder.findOpportunity(
			graphSnapshot,
			snapshotFindOpportunityParams,
		)
	}
}
