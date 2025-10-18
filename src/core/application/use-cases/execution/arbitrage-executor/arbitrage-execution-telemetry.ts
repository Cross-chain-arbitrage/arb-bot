import { Inject, Injectable, Logger } from '@nestjs/common'
import {
	ARBITRAGE_NOTIFIER_TOKEN,
	ArbitrageNotifier,
} from '../../../interfaces/arbitrage-notifier'
import { ArbitrageOpportunity } from '../../finding/snapshot-opportunity-finder/types'
import { ArbitrageResult } from './types'

@Injectable()
export class ArbitrageExecutionTelemetry {
	logger = new Logger(ArbitrageExecutionTelemetry.name)

	constructor(
		@Inject(ARBITRAGE_NOTIFIER_TOKEN)
		private readonly arbitrageNotifier: ArbitrageNotifier,
	) {}

	onArbitrageStart(opportunity: ArbitrageOpportunity) {
		this.logArbitrageStart(opportunity)
		this.arbitrageNotifier.notifyArbitrageStart(opportunity)
	}

	onArbitrageEnd(opportunity: ArbitrageOpportunity, result: ArbitrageResult) {
		this.logArbitrageEnd(result)
		this.arbitrageNotifier.notifyArbitrageEnd(opportunity, result)
	}

	private logArbitrageStart(opportunity: ArbitrageOpportunity) {
		const log = {
			opportunity,
		}

		this.logger.log(log, `Arbitrage execution started`)
	}

	private logArbitrageEnd(result: ArbitrageResult) {
		const log = {
			result,
		}

		this.logger.log(log, `Arbitrage execution ended`)
	}
}
