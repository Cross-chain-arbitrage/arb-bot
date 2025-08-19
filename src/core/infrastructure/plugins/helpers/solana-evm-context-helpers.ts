import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { GasPriceOracleService } from '../../evm/gas-price-oracle/gas-price-oracle.service'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { getExpectedTxCostInUsd as getExpectedEvmTxCostInUsd } from './evm-context-helpers'
import { getExpectedTxCostInUsd as getExpectedSolanaTxCostInUsd } from './solana-context-helpers'

export async function getExpectedTxCostInUsd(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		tokenUtils: TokenUtils
		priceOracle: PriceOracle
		gasPriceOracleService: GasPriceOracleService
	},
	from: SolanaToken | Token | NativeCurrency,
	gasOrUnitConsumption: bigint,
) {
	if (from instanceof SolanaToken) {
		return getExpectedSolanaTxCostInUsd.bind(this)(gasOrUnitConsumption)
	}

	return getExpectedEvmTxCostInUsd.bind(this)(from, gasOrUnitConsumption)
}
