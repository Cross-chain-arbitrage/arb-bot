import { Inject, Injectable, Logger } from '@nestjs/common'
import {
	ARBITRAGE_NOTIFIER_TOKEN,
	ArbitrageNotifier,
} from '../../../interfaces/arbitrage-notifier'
import { GraphArbitrageOpportunity } from '../../finding/snapshot-opportunity-finder/types'
import { PathExecutionResult } from '../path-executor/types'

@Injectable()
export class ArbitrageExecutionTelemetry {
	logger = new Logger(ArbitrageExecutionTelemetry.name)

	constructor(
		@Inject(ARBITRAGE_NOTIFIER_TOKEN)
		private readonly arbitrageNotifier: ArbitrageNotifier,
	) {}

	onArbitrageStart(opportunity: GraphArbitrageOpportunity) {
		this.logArbitrageStart(opportunity)
		this.arbitrageNotifier.notifyArbitrageStart(opportunity)
	}

	onArbitrageEnd(
		opportunity: GraphArbitrageOpportunity,
		result: PathExecutionResult,
	) {
		this.logArbitrageEnd(result)
		this.arbitrageNotifier.notifyArbitrageEnd(opportunity, result)
	}

	private logArbitrageStart(opportunity: GraphArbitrageOpportunity) {
		const log = {
			opportunity,
		}

		this.logger.log(log, `Arbitrage execution started`)
	}

	private logArbitrageEnd(result: PathExecutionResult) {
		const log = {
			phase: 'arbitrage_end',
			result,
		}

		this.logger.log(log, `Arbitrage execution ended`)
	}
}
