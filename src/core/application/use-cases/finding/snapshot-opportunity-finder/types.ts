import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'

export type SnapshotFindOpportunityParams = {
	minStartValueUsd: number
	maxStartValueUsd: number
	runCount: number
	startToken: Token
}

export type ArbitrageOpportunity = QuotedPath<Token> & {
	id: string
	profitInUsd: number
	revenueInUsd: number
	costInUsd: number
}
