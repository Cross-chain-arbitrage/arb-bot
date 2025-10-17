import { Token } from '../../../../domain/entities/token'
import { ArbitrageCycle } from '../../../../domain/value-objects/arbitrage-cycle'

export type SnapshotFindOpportunityParams = {
	minStartValueUsd: number
	maxStartValueUsd: number
	runCount: number
	startToken: Token
}

export type GraphArbitrageOpportunity = ArbitrageCycle<Token> & {
	id: string
	profitInUsd: number
	revenueInUsd: number
	costInUsd: number
}
