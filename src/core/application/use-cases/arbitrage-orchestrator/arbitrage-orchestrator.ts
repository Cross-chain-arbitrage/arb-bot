import { Injectable } from '@nestjs/common'
import { ArbitrageExecutor } from '../arbitrage-executor/arbitrage-executor'
import { ArbitrageFinder } from '../arbitrage-finder/arbitrage-finder'

@Injectable()
export class ArbitrageOrchestrator {
	constructor(
		private readonly arbitrageFinder: ArbitrageFinder,
		private readonly arbitrageExecutor: ArbitrageExecutor,
	) {}

	async findAndExecuteOpportunity() {
		const opportunity = await this.arbitrageFinder.findArbitrage()

		if (!opportunity) return

		await this.arbitrageExecutor.execute(opportunity)
	}
}
