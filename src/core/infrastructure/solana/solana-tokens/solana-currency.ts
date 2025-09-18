import { TokenMetadata } from '../../../domain/entities/token'
import { ChainIdUtils } from '../../../domain/services/chain-id-utils'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { TokenId } from '../../../domain/value-objects/token-id'
import { shortenAddress } from '../helpers'
import { formatUnits, parseUnits } from './solana-tokens-helpers'

const NAMESPACE = 'solana'
const MAINNET_REFERENCE = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'

export class SolanaCurrency {
	symbol: string
	decimals: number
	name?: string

	address: string
	private currencyId: TokenId

	constructor(address: string, tokenMetadata: TokenMetadata) {
		this.symbol = tokenMetadata.symbol
		this.decimals = tokenMetadata.decimals
		this.name = tokenMetadata.name
		this.address = address

		const chainId = ChainIdUtils.generateId(NAMESPACE, MAINNET_REFERENCE)
		this.currencyId = TokenIdUtils.generateId(chainId, address)
	}

	get id(): TokenId {
		return this.currencyId
	}

	formatUnits = formatUnits
	parseUnits = parseUnits

	toString(): string {
		return `${this.symbol} (Solana)`
	}

	toStringFull(): string {
		return `${this.symbol} ${shortenAddress(this.address)}`
	}
}
