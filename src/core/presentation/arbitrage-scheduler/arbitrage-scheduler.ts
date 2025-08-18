import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ArbitrageOrchestrator } from '../../application/use-cases/arbitrage-orchestrator/arbitrage-orchestrator'

@Injectable()
export class ArbitrageScheduler {
	constructor(
		private readonly arbitrageOrchestrator: ArbitrageOrchestrator,
	) {}

	// TODO: read expressively from config
	@Cron(CronExpression.EVERY_10_SECONDS, { waitForCompletion: true })
	async findAndExecuteOpportunity() {
		await this.arbitrageOrchestrator.findAndExecuteOpportunity()
	}
}
