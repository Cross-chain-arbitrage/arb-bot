import { Token } from '../../../../domain/entities/token'

export type ParamsFindOpportunity = {
	minStartValueUsd: number
	maxStartValueUsd: number
	runCount: number
	startToken: Token
}
