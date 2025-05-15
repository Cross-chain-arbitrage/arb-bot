export async function waitTime(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

export function isSameAddress(address1: Address, address2: Address): boolean {
	return address1.toLowerCase() === address2.toLowerCase()
}
