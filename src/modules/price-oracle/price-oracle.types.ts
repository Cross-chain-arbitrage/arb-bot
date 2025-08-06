import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { SolanaToken } from '../../solana/solana-token'

export type CurrencyId = string
export type Currency = Token | NativeCurrency | SolanaToken

export interface CurrencyState {
	price: number
	lastUpdated: number
	currency: Currency
}

/**
 * Settings for getting prices from the PriceOracle
 */
export interface PriceOracleSettings {
	/** Whether to pick values from the cache */
	useCachedValues: boolean
	/** The interval to update prices, false to not update prices, undefined to use the default interval */
	updateInterval: number | false | undefined
}
