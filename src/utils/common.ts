import { Logger } from '@nestjs/common'
import dotenv from 'dotenv'
import { BaseError, Hex, pad } from 'viem'

export const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms))

export function calculatePriceDiff(
	actualPrice: number,
	expectedPrice: number,
): number {
	return (actualPrice / expectedPrice) * 100 - 100
}

export function shortenAddress(address: string): string {
	return address.slice(0, 6) + '...' + address.slice(-4)
}

export function getEnvSafe(key: string): string {
	const value = process.env[key]

	if (!value) {
		throw new Error(`Environment variable ${key} is not set`)
	}

	return value
}

export async function runFnWithRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number,
	logger: Logger,
	retryDelay: number = 1000,
): Promise<T> {
	const errors: Error[] = []

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			const currentError = error as Error
			errors.push(currentError)

			logger.warn(
				{ err: currentError },
				`Attempt ${attempt}/${maxRetries} failed:`,
			)

			await wait(retryDelay)
		}
	}

	const errorSummary = errors
		.map((err, index) => {
			let errorMessage = ''
			switch (true) {
				case err instanceof BaseError:
					errorMessage = err.shortMessage
					break

				default:
					errorMessage = err.message
					break
			}
			return `Attempt ${index + 1}: ${errorMessage}`
		})
		.join('\n')

	const finalError = new Error(
		`Function ${fn.name} failed after ${maxRetries} attempts:\n${errorSummary}`,
	)

	finalError.name = 'RetryError'

	throw finalError
}

export function padAddressToBytes32(address: Address): Hex {
	return pad(address, { size: 32 })
}

dotenv.config()

export function createCustomError(errorName: string) {
	return class CustomError extends Error {
		constructor(
			message: string,
			public context?: unknown,
		) {
			super(message)
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
