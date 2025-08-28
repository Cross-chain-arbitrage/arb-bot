import { Inject, Injectable, Logger } from '@nestjs/common'
import { Graph } from '../../../domain/entities/graph'
import {
	GRAPH_VISUALIZER_TOKEN,
	GraphVisualizer,
} from '../../interfaces/graph-visualizer'
import { ArbitrageExecutor } from '../execution/arbitrage-executor/arbitrage-executor'
import { ArbitrageFinder } from '../finding/arbitrage-finder/arbitrage-finder'
import { GRAPH_TOKEN } from '../graph-builder/graph-token'
@Injectable()
export class ArbitrageOrchestrator {
	logger = new Logger(ArbitrageOrchestrator.name)

	constructor(
		private readonly arbitrageFinder: ArbitrageFinder,
		private readonly arbitrageExecutor: ArbitrageExecutor,

		@Inject(GRAPH_VISUALIZER_TOKEN)
		private readonly graphVisualizer: GraphVisualizer,

		@Inject(GRAPH_TOKEN)
		private readonly graph: Graph,
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
}
