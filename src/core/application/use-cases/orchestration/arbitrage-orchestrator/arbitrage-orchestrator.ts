import { Inject, Injectable, Logger } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { ArbitrageExecutor } from '../../execution/arbitrage-executor/arbitrage-executor'
import { ExecutionPreparer } from '../../execution/execution-preparer/execution-preparer'
import { ArbitrageFinder } from '../../finding/arbitrage-finder/arbitrage-finder'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'

@Injectable()
export class ArbitrageOrchestrator {
	logger = new Logger(ArbitrageOrchestrator.name)

	constructor(
		private readonly arbitrageFinder: ArbitrageFinder,
		private readonly arbitrageExecutor: ArbitrageExecutor,
		private readonly executionPreparer: ExecutionPreparer,

		@Inject(GRAPH_TOKEN)
		private readonly graph: Graph<Token>,
	) {}

	async findAndExecuteOpportunity() {
		const opportunity = await this.arbitrageFinder.findArbitrage()

		if (!opportunity) return

		await this.arbitrageExecutor.execute(opportunity)
	}

	async prepareExecution() {
		for (const [, edge] of this.graph.edges) {
			await this.executionPreparer.prepareExecution(edge)
		}
	}
}
