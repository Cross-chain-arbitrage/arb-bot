import { createCustomError } from '../../utils/common'
import { NativeCurrency } from './NativeCurrency'
import { Token } from './Token'

export const TokenAmountError = createCustomError('TokenAmountError')

export class TokenAmount {
	constructor(
		public readonly token: Token | NativeCurrency,
		public amount: bigint,
	) {}

	add(tokenAmount: TokenAmount) {
		this.validateToken(tokenAmount)
		this.amount += tokenAmount.amount
	}

	sub(tokenAmount: TokenAmount) {
		this.validateToken(tokenAmount)
		this.amount -= tokenAmount.amount
	}

	validateToken(tokenAmount: TokenAmount) {
		if (!this.token.isSame(tokenAmount.token))
			throw new TokenAmountError('Math operation on different tokens')
	}
}
