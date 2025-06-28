import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'

export type CurrencyId = TokenId
export type Currency = Token | NativeCurrency

export interface CurrencyState {
	price: number
	lastUpdated: number
	currency: Currency
}

export interface PriceOracleSettings {
	useCache: boolean
	updateInterval: number | false | undefined
}
