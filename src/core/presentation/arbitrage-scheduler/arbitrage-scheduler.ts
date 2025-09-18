import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { runFuncWithDelay } from '../../../utils/polling'
import { ArbitrageOrchestrator } from '../../application/use-cases/arbitrage-orchestrator/arbitrage-orchestrator'
import { ArbitrageSchedulerConfig } from './types'

export const ARBITRAGE_SCHEDULER_CONFIG_KEY = 'arbitrageScheduler'

@Injectable()
export class ArbitrageScheduler implements OnApplicationBootstrap {
	logger = new Logger(ArbitrageScheduler.name)

	constructor(
		private readonly arbitrageOrchestrator: ArbitrageOrchestrator,
		private readonly configService: ConfigService,
	) {}

	async onApplicationBootstrap() {
		const config = this.configService.get<ArbitrageSchedulerConfig>(
			ARBITRAGE_SCHEDULER_CONFIG_KEY,
		)

		if (!config) {
			throw new Error('Arbitrage scheduler config not found')
		}

		this.arbitrageOrchestrator.reportGraph()

		if (config.prepareExecution)
			await this.arbitrageOrchestrator.prepareExecution()

		await this.arbitrageOrchestrator.preparePriceOracle()

		void runFuncWithDelay(async () => {
			try {
				await this.arbitrageOrchestrator.findAndExecuteOpportunity()
			} catch (error) {
				this.logger.error(error)
			}
		}, config.runInterval)
	}
}
