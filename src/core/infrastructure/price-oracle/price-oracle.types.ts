import { NativeCurrency } from '../evm/primitives/tokens/NativeCurrency'
import { Token } from '../evm/primitives/tokens/Token'
import { SolanaNative } from '../solana/solana-tokens/solana-native'
import { SolanaToken } from '../solana/solana-tokens/solana-token'
import { WrappedSolanaNative } from '../solana/solana-tokens/wrapped-native'

export type CurrencyId = string
export type Currency =
	| Token
	| NativeCurrency
	| SolanaToken
	| SolanaNative
	| WrappedSolanaNative
/**
 * Settings for getting prices from the PriceOracle
 */
export interface PriceOracleSettings {
	/** Whether to pick values from the cache */
	useCachedValues: boolean
	/** The interval to update prices, false to not update prices, undefined to use the default interval */
	updateInterval: number | false | undefined
}
