import { Address, formatUnits, parseUnits } from "viem"
import { BaseContract } from "../contracts/BaseContract"

export abstract class TokenBase extends BaseContract {
	constructor(
		address: Address,
		chainId: number,
		public readonly symbol: string,
		public readonly decimals: number,
		public readonly name?: string,
	) {
		super(address, chainId)
	}

	abstract balanceOf(address: Address): Promise<bigint>

	formatUnits(amount: bigint): string {
		return formatUnits(amount, this.decimals)
	}

	parseUnits(amount: string | bigint): bigint {
		return parseUnits(amount.toString(), this.decimals)
	}
}
