import { Token } from '../../domain/entities/token'
import { ArbitrageOpportunity } from '../../domain/value-objects/opportunity'
import { QuotedPath } from '../../domain/value-objects/path'

export interface AppEvents {
	cycleQuoted: QuotedPath<Token>
	opportunityFound: ArbitrageOpportunity
}

export type EventName = keyof AppEvents
export type EventPayload<T extends EventName> = AppEvents[T]
