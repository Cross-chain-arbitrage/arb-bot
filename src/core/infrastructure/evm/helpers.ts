import { pad } from 'viem'

export function shortenAddress(address: string): string {
	return address.slice(0, 6) + '...' + address.slice(-4)
}

export function padAddressToBytes32(address: Address): Hex {
	return pad(address, { size: 32 })
}
