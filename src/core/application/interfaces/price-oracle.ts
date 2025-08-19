import { Token } from '../../domain/entities/token'

export interface PriceOracle {
	getPrice(token: Token): Promise<number>
	getPrices(tokens: Token[]): Promise<Record<string, number>>
}

export const PRICE_ORACLE_TOKEN = Symbol('PRICE_ORACLE_TOKEN')
