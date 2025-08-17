import { Injectable } from '@nestjs/common'
import { Graph } from '../../../domain/entities/graph'
import { GraphArbitrageOpportunity } from '../../../domain/services/bellman-ford'
import { GraphSnapshotBuilder } from '../graph-snapshot-builder/gpaph-snapshot-builder'
import { SnapshotOpportunityFinder } from '../snapshot-opportunity-finder/snapshot-opportunity-finder'
import { SnapshotFindOpportunityOptions } from '../snapshot-opportunity-finder/types'

@Injectable()
export class OpportunityFinder {
	constructor(
		private readonly graph: Graph,
		private readonly snapshotOpportunityFinder: SnapshotOpportunityFinder,
		private readonly graphSnapshotBuilder: GraphSnapshotBuilder,
	) {}

	async findOpportunity(
		snapshotFindOpportunityOptions: SnapshotFindOpportunityOptions,
	): Promise<GraphArbitrageOpportunity | null> {
		const graphSnapshot = await this.graphSnapshotBuilder.buildSnapshot(
			this.graph,
		)

		return this.snapshotOpportunityFinder.findOpportunity(
			graphSnapshot,
			snapshotFindOpportunityOptions,
		)
	}
}
