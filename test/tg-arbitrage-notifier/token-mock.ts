import { formatUnits, parseUnits } from 'viem'
import { Token } from '../../src/core/domain/entities/token'
import { TokenIdUtils } from '../../src/core/domain/services/token-id-utils'

export class TokenMock implements Token {
	address: string
	id: `${string}:${string}:${string}`
	decimals = 18
	symbol: string

	constructor(symbol: string, address: string) {
		this.address = address
		this.id = TokenIdUtils.generateId('namespace:reference', address)
		this.symbol = symbol
	}

	formatUnits = (amount: bigint) => formatUnits(amount, 18)
	parseUnits = (amount: bigint | string) => parseUnits(amount.toString(), 18)
}
