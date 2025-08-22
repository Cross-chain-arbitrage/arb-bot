import { Inject, Injectable, Logger } from '@nestjs/common'
import {
	GRAPH_VISUALIZER_TOKEN,
	GraphVisualizer,
} from '../../interfaces/graph-visualizer'
import { ArbitrageExecutor } from '../execution/arbitrage-executor/arbitrage-executor'
import { ArbitrageFinder } from '../finding/arbitrage-finder/arbitrage-finder'
import { GRAPH_WITH_EDGE_OWNERS_TOKEN } from '../graph-builder/di-tokens'
import { GraphWithEdgeOwners } from '../graph-builder/types'
@Injectable()
export class ArbitrageOrchestrator {
	logger = new Logger(ArbitrageOrchestrator.name)

	constructor(
		private readonly arbitrageFinder: ArbitrageFinder,
		private readonly arbitrageExecutor: ArbitrageExecutor,

		@Inject(GRAPH_VISUALIZER_TOKEN)
		private readonly graphVisualizer: GraphVisualizer,

		@Inject(GRAPH_WITH_EDGE_OWNERS_TOKEN)
		private readonly graphWithEdgeOwners: GraphWithEdgeOwners,
	) {}

	async findAndExecuteOpportunity() {
		const opportunity = await this.arbitrageFinder.findArbitrage()

		if (!opportunity) return

		await this.arbitrageExecutor.execute(opportunity)
	}

	reportGraph() {
		const link = this.graphVisualizer.getLinkToGraph(
			this.graphWithEdgeOwners,
		)

		this.logger.log(link)
	}
}
