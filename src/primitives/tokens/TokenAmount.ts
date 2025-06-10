import { Token } from './Token'

export class TokenAmountError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, TokenAmountError.prototype)
		this.name = 'TokenAmountError'
	}
}

export class TokenAmount {
	constructor(
		public readonly token: Token,
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
		if (this.token !== tokenAmount.token)
			throw new TokenAmountError('Math operation on different tokens')
	}
}
