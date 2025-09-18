import { Inject, Injectable, Logger } from '@nestjs/common'
import { Graph } from '../../../domain/entities/graph'
import { Token } from '../../../domain/entities/token'
import {
	GRAPH_VISUALIZER_TOKEN,
	GraphVisualizer,
} from '../../interfaces/graph-visualizer'
import { PRICE_ORACLE_TOKEN, PriceOracle } from '../../interfaces/price-oracle'
import { ArbitrageExecutor } from '../execution/arbitrage-executor/arbitrage-executor'
import { ExecutionPreparer } from '../execution/execution-preparer/execution-preparer'
import { ArbitrageFinder } from '../finding/arbitrage-finder/arbitrage-finder'
import { GRAPH_TOKEN } from '../graph-builder/graph-token'
@Injectable()
export class ArbitrageOrchestrator {
	logger = new Logger(ArbitrageOrchestrator.name)

	constructor(
		private readonly arbitrageFinder: ArbitrageFinder,
		private readonly arbitrageExecutor: ArbitrageExecutor,
		private readonly executionPreparer: ExecutionPreparer,

		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,

		@Inject(GRAPH_VISUALIZER_TOKEN)
		private readonly graphVisualizer: GraphVisualizer,

		@Inject(GRAPH_TOKEN)
		private readonly graph: Graph<Token>,
	) {}

	async findAndExecuteOpportunity() {
		const opportunity = await this.arbitrageFinder.findArbitrage()

		if (!opportunity) return

		await this.arbitrageExecutor.execute(opportunity)
	}

	reportGraph() {
		const link = this.graphVisualizer.getLinkToGraph(this.graph)

		this.logger.log(link)
	}

	async prepareExecution() {
		for (const [, edge] of this.graph.edges) {
			await this.executionPreparer.prepareExecution(edge)
		}
	}

	async preparePriceOracle() {
		await this.priceOracle.getPrices(Array.from(this.graph.nodes.values()))
	}
}
