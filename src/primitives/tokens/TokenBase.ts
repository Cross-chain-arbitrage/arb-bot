import { Address, formatUnits, parseUnits } from 'viem'
import { Stargate } from '../../bridges/stargate/Stargate'
import { shortenAddress } from '../../utils/common'
import { BaseContract } from '../contracts/BaseContract'
export class TokenBaseError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, TokenBaseError.prototype)
		this.name = 'TokenBaseError'
	}
}

type ChainId = number
export type TokenId = `${ChainId}:${Address}`

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

	abstract isNative(): boolean

	abstract balanceOf(address: Address): Promise<bigint>

	formatUnits(amount: bigint): string {
		return formatUnits(amount, this.decimals)
	}

	parseUnits(amount: string | bigint): bigint {
		return parseUnits(amount.toString(), this.decimals)
	}

	async hasEnoughBalance(address: Address, amount: bigint): Promise<boolean> {
		const balance = await this.balanceOf(address)

		return balance >= amount
	}

	get id(): TokenId {
		return `${this.chainId}:${this.address.toLowerCase() as Address}`
	}

	toString(): string {
		try {
			const chainKey = Stargate.getChainKey(this.chainId)
			return `${this.symbol} ${chainKey}`
		} catch (error) {
			return `${this.symbol} ${this.chainId}`
		}
	}

	toStringFull(): string {
		return `${this.symbol} ${this.chainId} ${shortenAddress(this.address)}`
	}
}
