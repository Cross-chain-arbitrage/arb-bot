import { PathExecutionResult } from '../use-cases/execution/path-executor/types'
import { GraphArbitrageOpportunity } from '../use-cases/finding/snapshot-opportunity-finder/types'

export const ARBITRAGE_NOTIFIER_TOKEN = Symbol('ARBITRAGE_NOTIFIER_TOKEN')

export interface ArbitrageNotifier {
	notifyArbitrageStart(opportunity: GraphArbitrageOpportunity): void

	notifyArbitrageEnd(
		opportunity: GraphArbitrageOpportunity,
		result: PathExecutionResult,
	): void
}
