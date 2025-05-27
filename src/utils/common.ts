import { isAddress } from 'viem'

export const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms))

export function isSameAddress(address1: Address, address2: Address): boolean {
	if (!isAddress(address1)) {
		throw new Error(`Invalid address 1: ${JSON.stringify(address1)}`)
	}

	if (!isAddress(address2)) {
		throw new Error(`Invalid address 2: ${JSON.stringify(address2)}`)
	}

	return address1.toLowerCase() === address2.toLowerCase()
}

export function divideByDecimals(amount: bigint, decimals: number): number {
	return Number(amount) / 10 ** decimals
}

export function multiplyByDecimals(amount: number, decimals: number): bigint {
	return BigInt(Math.floor(amount * 10 ** decimals))
}

export function calculatePriceDiff(
	actualPrice: number,
	expectedPrice: number,
): number {
	return (actualPrice / expectedPrice) * 100 - 100
}

export function shortenAddress(address: Address): string {
	return address.slice(0, 6) + '...' + address.slice(-4)
}
