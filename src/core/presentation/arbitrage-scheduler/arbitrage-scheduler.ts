import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { runFuncWithDelay } from '../../../utils/polling'
import { ARBITRAGE_FINDER_CONFIG_KEY } from '../../application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import { ArbitrageFinderConfig } from '../../application/use-cases/finding/arbitrage-finder/types'
import { ArbitrageOrchestrator } from '../../application/use-cases/orchestration/arbitrage-orchestrator/arbitrage-orchestrator'
import { BotOrchestrator } from '../../application/use-cases/orchestration/bot-orchestrator/bot-orchestrator'
import { ArbitrageSchedulerConfig } from './types'

export const ARBITRAGE_SCHEDULER_CONFIG_KEY = 'arbitrageScheduler'

@Injectable()
export class ArbitrageScheduler implements OnApplicationBootstrap {
	logger = new Logger(ArbitrageScheduler.name)

	constructor(
		private readonly botOrchestrator: BotOrchestrator,
		private readonly arbitrageOrchestrator: ArbitrageOrchestrator,
		private readonly configService: ConfigService,
	) {}

	async onApplicationBootstrap() {
		const arbitrageSchedulerConfig =
			this.configService.get<ArbitrageSchedulerConfig>(
				ARBITRAGE_SCHEDULER_CONFIG_KEY,
			)

		this.botOrchestrator.reportGraph()

		const arbitrageFinderConfig =
			this.configService.get<ArbitrageFinderConfig>(
				ARBITRAGE_FINDER_CONFIG_KEY,
			)

		if (!arbitrageFinderConfig) {
			throw new Error('Arbitrage finder config not found')
		}

		if (arbitrageSchedulerConfig?.prepareExecution)
			await this.arbitrageOrchestrator.prepareExecution()

		await this.botOrchestrator.preparePriceOracle()

		void runFuncWithDelay(async () => {
			try {
				await this.arbitrageOrchestrator.findAndExecuteOpportunity()
			} catch (error) {
				this.logger.error(error)
			}
		}, arbitrageFinderConfig.runInterval)
	}
}
