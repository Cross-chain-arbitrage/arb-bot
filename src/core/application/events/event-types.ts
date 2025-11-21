import { Token } from '../../domain/entities/token'
import { QuotedPath } from '../../domain/value-objects/path'
import { ArbitrageOpportunity } from '../use-cases/finding/snapshot-opportunity-finder/types'

export interface AppEvents {
	cycleQuoted: QuotedPath<Token>
	opportunityFound: ArbitrageOpportunity
}

export type EventName = keyof AppEvents
export type EventPayload<T extends EventName> = AppEvents[T]
