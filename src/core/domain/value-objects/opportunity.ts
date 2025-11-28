import { Token } from '../entities/token'
import { QuotedPath } from './path'

export type ArbitrageOpportunity = QuotedPath<Token> & {
	id: string
	profitInUsd: number
	revenueInUsd: number
	costInUsd: number
}
