export class TokenError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, TokenError.prototype)
		this.name = "TokenError"
	}
}

export class NativeCurrencyError extends TokenError {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, NativeCurrencyError.prototype)
		this.name = "NativeCurrencyError"
	}
}
