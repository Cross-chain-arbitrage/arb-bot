import { ArbitrageResult } from '../use-cases/execution/arbitrage-executor/types'
import { ArbitrageOpportunity } from '../use-cases/finding/snapshot-opportunity-finder/types'

export const ARBITRAGE_NOTIFIER_TOKEN = Symbol('ARBITRAGE_NOTIFIER_TOKEN')

export interface ArbitrageNotifier {
	notifyArbitrageStart(opportunity: ArbitrageOpportunity): void

	notifyArbitrageEnd(
		opportunity: ArbitrageOpportunity,
		result: ArbitrageResult,
	): void
}
