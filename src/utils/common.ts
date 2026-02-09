import dotenv from 'dotenv'

export const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms))

dotenv.config()
export function getEnvSafe(key: string): string {
	const value = process.env[key]

	if (!value) {
		throw new Error(`Environment variable ${key} is not set`)
	}

	return value
}

export class ContextError extends Error {
	constructor(
		message: string,
		public context?: unknown,
	) {
		super(message)
	}
}

export function createCustomError(errorName: string) {
	return class CustomError extends ContextError {
		constructor(message: string, context?: unknown) {
			super(message, context)
			Object.setPrototypeOf(this, new.target.prototype)
			this.name = errorName
		}
	}
}

/**
 * Compares two strings in a case-insensitive manner
 */
export function isStringsEqual(a: string, b: string): boolean {
	return a.toLowerCase() === b.toLowerCase()
}

export function convertDecimals<T extends { decimals: number }>(
	value: bigint,
	from: T,
	to: T,
): bigint {
	const fromDecimals = from.decimals
	const toDecimals = to.decimals

	const diff = fromDecimals - toDecimals

	if (diff > 0) {
		return value / 10n ** BigInt(diff)
	} else {
		return value * 10n ** BigInt(-diff)
	}
}
