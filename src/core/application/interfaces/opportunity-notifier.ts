import { ArbitrageOpportunity } from '../use-cases/finding/snapshot-opportunity-finder/types'

export const OPPORTUNITY_NOTIFIER_TOKEN = Symbol('OPPORTUNITY_NOTIFIER_TOKEN')

export interface OpportunityNotifier {
	notifyOpportunity(opportunity: ArbitrageOpportunity): void
}
