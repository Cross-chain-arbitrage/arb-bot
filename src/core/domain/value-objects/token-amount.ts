import { Token } from '../entities/token'

export interface TokenAmount<SpecificToken = object> {
	token: Token<SpecificToken>
	amount: bigint
}
