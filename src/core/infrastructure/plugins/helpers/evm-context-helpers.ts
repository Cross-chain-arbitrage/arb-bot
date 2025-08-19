import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { GasPriceOracleService } from '../../evm/gas-price-oracle/gas-price-oracle.service'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'

export async function getExpectedTxCostInUsd(
	this: {
		gasPriceOracleService: GasPriceOracleService
		tokenUtils: TokenUtils
		priceOracle: PriceOracle
	},
	from: Token | NativeCurrency,
	gas: bigint,
) {
	const gasPrice = await this.gasPriceOracleService.getGasPrice(from.chainId)

	const txCostInNative = gas * gasPrice

	return getUsdCostOfNativeAmount.bind(this)(from, txCostInNative)
}

export async function getUsdCostOfNativeAmount(
	this: {
		tokenUtils: TokenUtils
		priceOracle: PriceOracle
	},
	from: Token | NativeCurrency,
	nativeAmount: bigint,
) {
	const native = this.tokenUtils.getNative(from.chainId)
	const nativePrice = await this.priceOracle.getPrice(native)

	const costInUsd = Number(native.formatUnits(nativeAmount)) * nativePrice

	return costInUsd
}
