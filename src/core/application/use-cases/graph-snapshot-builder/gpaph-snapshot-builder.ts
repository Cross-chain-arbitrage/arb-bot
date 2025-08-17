import { Inject, Injectable } from '@nestjs/common'
import { Graph } from '../../../domain/entities/graph'
import {
	GraphSnapshot,
	Quote,
} from '../../../domain/value-objects/weighted-graph-snapshot'
import { EdgeQuoteProviderRegistry } from '../../interfaces/edge-quote-provider'

const EDGE_QUOTE_PROVIDER_REGISTRY_TOKEN = Symbol(
	'EDGE_QUOTE_PROVIDER_REGISTRY_TOKEN',
)

@Injectable()
export class GraphSnapshotBuilder {
	constructor(
		@Inject(EDGE_QUOTE_PROVIDER_REGISTRY_TOKEN)
		private readonly edgeQuoteProviderRegistry: EdgeQuoteProviderRegistry,
	) {}

	async buildSnapshot(graph: Graph): Promise<GraphSnapshot> {
		const fns = new Map<EdgeId, (amountIn: bigint) => Quote>()

		// TODO: make it parallel
		for (const [edgeId] of graph.edges) {
			const provider = this.edgeQuoteProviderRegistry[edgeId]

			const fn = await provider.buildEdgeSnapshotFn()

			fns.set(edgeId, fn)
		}

		return {
			graph,
			getQuote: (edgeId, amountIn) => {
				const fn = fns.get(edgeId)
				if (!fn) throw new Error(`No quote function for edge ${edgeId}`)
				return fn(amountIn)
			},
		}
	}
}
