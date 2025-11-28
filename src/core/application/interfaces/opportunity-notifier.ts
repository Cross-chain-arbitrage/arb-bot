import { ArbitrageOpportunity } from '../../domain/value-objects/opportunity'

export const OPPORTUNITY_NOTIFIER_TOKEN = Symbol('OPPORTUNITY_NOTIFIER_TOKEN')

export interface OpportunityNotifier {
	notifyOpportunity(opportunity: ArbitrageOpportunity): void
}
