import { Address, formatUnits, isAddressEqual, parseUnits } from 'viem'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { shortenAddress } from '../../utils/common'
import { BaseContract } from '../contracts/BaseContract'

export interface TokenMetadata {
	symbol: string
	name?: string
	decimals: number
}

export abstract class TokenBase extends BaseContract {
	public readonly symbol: string
	public readonly decimals: number
	public readonly name?: string

	constructor(
		chainClientService: ChainClientService,
		address: Address,
		chainId: number,
		tokenMetadata: TokenMetadata,
	) {
		super(chainClientService, address, chainId)

		this.symbol = tokenMetadata.symbol
		this.decimals = tokenMetadata.decimals
		this.name = tokenMetadata.name
	}

	abstract isNative(): boolean

	isSame(token: TokenBase): boolean {
		return (
			isAddressEqual(this.address, token.address) &&
			this.chainId === token.chainId
		)
	}

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

	override toString(): string {
		const chainName = this.chainClientService.getChainNameById(this.chainId)

		return `${this.symbol} (${chainName ?? this.chainId})`
	}

	toStringFull(): string {
		return `${this.symbol} ${this.chainId} ${shortenAddress(this.address)}`
	}
}
