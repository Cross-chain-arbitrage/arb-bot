import { Token } from '../../../domain/entities/token'

export type SnapshotFindOpportunityOptions = {
	minStartValueUsd: number
	maxStartValueUsd: number
	runCount: number
	startToken: Token
}
