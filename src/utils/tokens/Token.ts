import { Address, erc20Abi, isAddress } from "viem"
import { TokenError } from "../errors/TokenErrors"
import { NATIVE_ADDRESS, STARGATE_NATIVE_ADDRESS } from "./NativeCurrency"
import { TokenBase } from "./TokenBase"

export class Token extends TokenBase {
	constructor(
		address: Address,
		chainId: number,
		symbol: string,
		decimals: number,
		name?: string,
	) {
		super(address, chainId, symbol, decimals, name)
		this.validateAddress(address)
		this.validateDecimals(decimals)
	}

	private validateAddress(address: Address): void {
		if (!isAddress(address)) {
			throw new TokenError(`Invalid address for token ${this.symbol}`)
		}

		if (address === NATIVE_ADDRESS || address === STARGATE_NATIVE_ADDRESS) {
			throw new TokenError(
				`Cannot make a token from native currency ${this.symbol}`,
			)
		}
	}

	private validateDecimals(decimals: number): void {
		if (decimals < 0 || decimals > 18) {
			throw new TokenError(
				`Invalid token decimals (${decimals}), must be between 0 and 18`,
			)
		}
	}

	async balanceOf(address: Address): Promise<bigint> {
		const balance = await this.client.readContract({
			address: this.address,
			abi: erc20Abi,
			functionName: "balanceOf",
			args: [address],
		})
		return balance
	}

	async allowance(address: Address, spender: Address): Promise<bigint> {
		const allowance = await this.client.readContract({
			address: this.address,
			abi: erc20Abi,
			functionName: "allowance",
			args: [address, spender],
		})
		return allowance
	}
}
