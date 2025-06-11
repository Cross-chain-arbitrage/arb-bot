const PRECISION = 10n ** 6n

export class MathError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, MathError.prototype)
		this.name = 'MathError'
	}
}

export function safeMultiply(a: bigint, b: number): bigint {
	if (a === undefined || a === null || isNaN(Number(a)))
		throw new MathError('`a` is undefined, null, or NaN')

	if (b === undefined || b === null || isNaN(Number(b)))
		throw new MathError('`b` is undefined, null, or NaN')

	const bigInteger = BigInt(Math.round(b * Number(PRECISION)))
	return (a * bigInteger) / PRECISION
}
