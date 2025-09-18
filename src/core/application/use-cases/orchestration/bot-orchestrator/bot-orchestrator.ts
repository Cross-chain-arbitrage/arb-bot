import { Inject, Injectable, Logger } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import {
	GRAPH_VISUALIZER_TOKEN,
	GraphVisualizer,
} from '../../../interfaces/graph-visualizer'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../interfaces/price-oracle'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'

@Injectable()
export class BotOrchestrator {
	logger = new Logger(BotOrchestrator.name)

	constructor(
		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,

		@Inject(GRAPH_VISUALIZER_TOKEN)
		private readonly graphVisualizer: GraphVisualizer,

		@Inject(GRAPH_TOKEN)
		private readonly graph: Graph<Token>,
	) {}

	reportGraph() {
		const link = this.graphVisualizer.getLinkToGraph(this.graph)

		this.logger.log(link)
	}

	async preparePriceOracle() {
		await this.priceOracle.getPrices(Array.from(this.graph.nodes.values()))
	}
}
