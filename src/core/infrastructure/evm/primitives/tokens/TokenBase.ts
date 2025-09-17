import { Address, formatUnits, isAddressEqual, parseUnits } from 'viem'
import { Token, TokenMetadata } from '../../../../domain/entities/token'
import { ChainIdUtils } from '../../../../domain/services/chain-id-utils'
import { TokenIdUtils } from '../../../../domain/services/token-id-utils'
import { TokenId } from '../../../../domain/value-objects/token-id'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { shortenAddress } from '../../helpers'
import { BaseContract } from '../contracts/BaseContract'

const NAMESPACE = 'eip155'

export abstract class TokenBase extends BaseContract implements Token {
	public readonly symbol: string
	public readonly decimals: number
	public readonly name?: string

	private currencyId: TokenId

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

		const caip2ChainId = ChainIdUtils.generateId(
			NAMESPACE,
			chainId.toString(),
		)
		this.currencyId = TokenIdUtils.generateId(caip2ChainId, address)
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
		return this.currencyId
	}

	override toString(): string {
		const chainName = this.chainClientService.getChainNameById(this.chainId)

		return `${this.symbol} (${chainName ?? this.chainId})`
	}

	toStringFull(): string {
		return `${this.symbol} ${this.chainId} ${shortenAddress(this.address)}`
	}
}
