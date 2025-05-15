import { isAddress } from 'viem'

export async function waitTime(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

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
