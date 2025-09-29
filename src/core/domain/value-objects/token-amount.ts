import { Token } from '../entities/token'

export interface TokenAmount {
	token: Token
	amount: bigint
}
