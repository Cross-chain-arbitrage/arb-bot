import { TransactionReceipt } from 'viem/_types/types/transaction'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { GasPriceOracleService } from '../../evm/gas-price-oracle/gas-price-oracle.service'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'

export async function getExpectedTxCostInUsd(
	this: {
		gasPriceOracleService: GasPriceOracleService
		tokenUtils: TokenUtils
		priceOracle: PriceOracle
	},
	chainId: number,
	gas: bigint,
) {
	const gasPrice = await this.gasPriceOracleService.getGasPrice(chainId)

	const txCostInNative = gas * gasPrice

	return getUsdCostOfNativeAmount.bind(this)(chainId, txCostInNative)
}

export async function getUsdCostOfNativeAmount(
	this: {
		tokenUtils: TokenUtils
		priceOracle: PriceOracle
	},
	chainId: number,
	nativeAmount: bigint,
) {
	const native = this.tokenUtils.getNative(chainId)
	const nativePrice = await this.priceOracle.getPrice(native)

	const costInUsd = Number(native.formatUnits(nativeAmount)) * nativePrice

	return costInUsd
}

export async function getTxCostInUsd(
	this: {
		tokenUtils: TokenUtils
		priceOracle: PriceOracle
	},
	chainId: number,
	txResult: TransactionReceipt,
) {
	const txCostInNative = txResult.gasUsed * txResult.effectiveGasPrice

	return getUsdCostOfNativeAmount.bind(this)(chainId, txCostInNative)
}
