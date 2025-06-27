import { createCustomError } from '../../utils/common'
import { NativeCurrency } from './NativeCurrency'
import { Token } from './Token'
import { TokenBase } from './TokenBase'
import { WrappedNative } from './WrappedNative'

export const TokenAmountError = createCustomError('TokenAmountError')

export class TokenAmount extends TokenBase {
	constructor(
		protected readonly underlyingToken:
			| Token
			| NativeCurrency
			| WrappedNative,
		public amount: bigint,
	) {
		super(
			underlyingToken.address,
			underlyingToken.chainId,
			underlyingToken.symbol,
			underlyingToken.decimals,
		)
	}

	isNative(): boolean {
		return this.underlyingToken.isNative()
	}

	balanceOf(address: Address): Promise<bigint> {
		return this.underlyingToken.balanceOf(address)
	}

	add(tokenAmount: TokenAmount) {
		this.validateToken(tokenAmount)
		this.amount += tokenAmount.amount
	}

	sub(tokenAmount: TokenAmount) {
		this.validateToken(tokenAmount)
		this.amount -= tokenAmount.amount
	}

	validateToken(tokenAmount: TokenAmount) {
		if (!this.isSame(tokenAmount))
			throw new TokenAmountError('Math operation on different tokens')
	}
}
