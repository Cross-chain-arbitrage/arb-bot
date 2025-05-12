import { Address } from "viem"
import { NATIVE_ADDRESS, STARGATE_NATIVE_ADDRESS } from "./NativeCurrency"
import { Token } from "./Token"
import { ClientManager } from "../ClientManager"
import { ERC20_ABI } from "../../abi/erc20"

export class TokenUtils {
	static isNative(address: Address): boolean {
		return address === NATIVE_ADDRESS || address === STARGATE_NATIVE_ADDRESS
	}

	static isToken(address: Address): boolean {
		return !this.isNative(address)
	}

	static async fromAddress(
		address: Address,
		chainId: number,
	): Promise<Token | NativeCurrency> {
		const client = ClientManager.getClient(chainId)
		const abi = ERC20_ABI

		const [decimals, name, symbol] = await Promise.all([
			client.readContract({
				address,
				abi,
				functionName: "decimals",
			}),
			client.readContract({
				address,
				abi,
				functionName: "name",
			}),
			client.readContract({
				address,
				abi,
				functionName: "symbol",
			}),
		])

		return new Token(address, chainId, symbol, decimals, name)
	}
}
