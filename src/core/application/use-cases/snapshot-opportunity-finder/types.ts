import { Token } from '../../../domain/entities/token'
import { GraphArbitrageCycle } from '../../../domain/services/bellman-ford'

export type SnapshotFindOpportunityParams = {
	minStartValueUsd: number
	maxStartValueUsd: number
	runCount: number
	startToken: Token
}

export type GraphArbitrageOpportunity = GraphArbitrageCycle & {
	startToken: Token
}
