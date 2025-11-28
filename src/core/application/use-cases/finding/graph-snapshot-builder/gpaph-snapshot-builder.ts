import { Inject, Injectable } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { EdgeId } from '../../../../domain/value-objects/edge-id'
import { Quote } from '../../../../domain/value-objects/quote'
import { GraphSnapshot } from '../../../../domain/value-objects/weighted-graph-snapshot'
import {
	SNAPSHOT_BUILDERS_REGISTRY_TOKEN,
	SnapshotBuildersRegistry,
} from '../../../interfaces/edge-snapshot-builder'

@Injectable()
export class GraphSnapshotBuilder {
	constructor(
		@Inject(SNAPSHOT_BUILDERS_REGISTRY_TOKEN)
		private readonly edgeSnapshotBuilderRegistry: SnapshotBuildersRegistry,
	) {}

	async buildSnapshot(graph: Graph): Promise<GraphSnapshot> {
		const fns = new Map<EdgeId, (amountIn: bigint) => Quote>()

		const promises = []

		for (const [edgeId] of graph.edges) {
			promises.push(this.buildAndSetSnapshotBuilder(fns, edgeId))
		}

		await Promise.all(promises)

		return {
			graph,
			getQuote: (edgeId, amountIn) => {
				const fn = fns.get(edgeId)
				if (!fn) throw new Error(`No quote function for edge ${edgeId}`)
				return fn(amountIn)
			},
		}
	}

	async buildAndSetSnapshotBuilder(
		fns: Map<EdgeId, (amountIn: bigint) => Quote>,
		edgeId: EdgeId,
	) {
		const provider = this.edgeSnapshotBuilderRegistry.get(edgeId)

		if (!provider) {
			throw new Error(
				`Edge snapshot builder not found for edge ${edgeId}`,
			)
		}

		const fn = await provider.buildEdgeSnapshotFn()

		fns.set(edgeId, fn)
	}
}
