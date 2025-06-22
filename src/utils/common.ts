import dotenv from 'dotenv'
import { Hex, pad } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import logger from './logger'

export const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms))

export function calculatePriceDiff(
	actualPrice: number,
	expectedPrice: number,
): number {
	return (actualPrice / expectedPrice) * 100 - 100
}

export function shortenAddress(address: Address): string {
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
): Promise<T> {
	const errors: Error[] = []

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			const currentError = error as Error
			errors.push(currentError)

			logger.warn(
				`Attempt ${attempt}/${maxRetries} failed:`,
				currentError,
			)

			if (attempt === maxRetries) {
				const errorSummary = errors
					.map((err, index) => `Attempt ${index + 1}: ${err.message}`)
					.join('\n')

				const finalError = new Error(
					`Function failed after ${maxRetries} attempts:\n${errorSummary}`,
				)
				finalError.name = 'RetryError'
				throw finalError
			}
		}
	}

	// This should never be reached, but TypeScript requires it
	throw new Error('Unexpected error in retry function')
}

export function padAddressToBytes32(address: Address): Hex {
	return pad(address, { size: 32 })
}

dotenv.config()

export function getPrivateKey(): Hex {
	const privateKey = process.env[`PRIVATE_KEY`]

	if (!privateKey) {
		throw new Error(`Private key not found`)
	}

	return privateKey as Hex
}

export function getAccountAddress() {
	const pk = getPrivateKey()
	const account = privateKeyToAccount(pk)

	return account.address
}

export function createCustomError(errorName: string) {
	return class CustomError extends Error {
		constructor(message: string) {
			super(message)
			Object.setPrototypeOf(this, new.target.prototype)
			this.name = errorName
		}
	}
}
