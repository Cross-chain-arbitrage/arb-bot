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
	let lastError: Error

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error

			logger.warn(
				`Attempt ${fn.name} ${attempt}/${maxRetries} failed, error message: ${lastError.message}`,
			)
		}
	}

	throw lastError!
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
