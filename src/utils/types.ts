import { Address, Hex, pad } from "viem"

export function padAddressToBytes32(address: Address): Hex {
	return pad(address, { size: 32 })
}
