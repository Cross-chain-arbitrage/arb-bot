import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { runFuncWithDelay } from '../../../utils/polling'
import {
	ARBITRAGE_FINDER_CONFIG_KEY,
	ArbitrageFinder,
} from '../../application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import { ArbitrageFinderConfig } from '../../application/use-cases/finding/arbitrage-finder/types'
import { BotOrchestrator } from '../../application/use-cases/orchestration/bot-orchestrator/bot-orchestrator'

@Injectable()
export class FinderScheduler implements OnApplicationBootstrap {
	logger = new Logger(FinderScheduler.name)

	constructor(
		private readonly botOrchestrator: BotOrchestrator,
		private readonly arbitrageFinder: ArbitrageFinder,
		private readonly configService: ConfigService,
	) {}

	async onApplicationBootstrap() {
		this.botOrchestrator.reportGraph()

		await this.botOrchestrator.preparePriceOracle()

		const arbitrageFinderConfig =
			this.configService.get<ArbitrageFinderConfig>(
				ARBITRAGE_FINDER_CONFIG_KEY,
			)

		if (!arbitrageFinderConfig) {
			throw new Error('Arbitrage finder config not found')
		}

		void runFuncWithDelay(async () => {
			try {
				await this.arbitrageFinder.findArbitrage()
			} catch (error) {
				this.logger.error(error)
			}
		}, arbitrageFinderConfig.runInterval)
	}
}
