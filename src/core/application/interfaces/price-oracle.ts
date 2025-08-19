import { Token } from '../../domain/entities/token'

export interface CurrencyState {
	price: number
	lastUpdated: number
	currency: Token
}

export interface PriceOracle {
	getPrice(token: Token): Promise<number>
	getPrices(tokens: Token[]): Promise<CurrencyState[]>
}

export const PRICE_ORACLE_TOKEN = Symbol('PRICE_ORACLE_TOKEN')
