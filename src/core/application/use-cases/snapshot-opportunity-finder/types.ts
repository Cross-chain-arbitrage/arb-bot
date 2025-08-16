import { Token } from '../../../domain/entities/token'

export type FindOpportunityOptions = {
	minStartValueUsd: number
	maxStartValueUsd: number
	runCount: number
	startToken: Token
}
