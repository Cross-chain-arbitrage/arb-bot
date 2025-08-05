import { TransactionReceipt } from 'viem'
import { GasPriceOracleService } from '../../../gas-price-oracle/gas-price-oracle.service'
import { PriceOracleService } from '../../../modules/price-oracle/price-oracle.service'
import { TokenAmount } from '../../../primitives/tokens/TokenAmount'
import { TokenUtils } from '../../../primitives/tokens/TokenUtils'

export class EdgeHelperService {
	constructor(
		private readonly gasPriceOracleService: GasPriceOracleService,
		private readonly priceOracleService: PriceOracleService,
		private readonly tokenUtils: TokenUtils,
	) {}

	async getExpectedGasCostInUsd(from: GraphNode, gas: bigint) {
		const native = this.tokenUtils.getNative(from.chainId)

		const gasPrice = await this.gasPriceOracleService.getGasPrice(
			from.chainId,
		)

		const nativePrice = await this.priceOracleService.getPrice(native)

		const costInUsd =
			Number(native.formatUnits(gas * gasPrice)) * nativePrice

		return costInUsd
	}

	async getAdditionalCostInUsd(additionalCost: TokenAmount) {
		const additionalCostTokenPrice = await this.priceOracleService.getPrice(
			additionalCost.underlyingToken,
		)

		const additionalCostInUsd =
			Number(additionalCost.formatUnits(additionalCost.amount)) *
			additionalCostTokenPrice

		return additionalCostInUsd
	}

	async getActualGasCostInUsd(
		from: GraphNode,
		txReceipt: TransactionReceipt,
	) {
		let txCostInNative = 0
		try {
			// viem returns not bigint for one of the values (probably effectiveGasPrice)
			txCostInNative = Number(
				txReceipt.gasUsed * txReceipt.effectiveGasPrice,
			)
		} catch (e) {
			throw Error(
				`Error calculating tx cost in native for tx ${txReceipt.transactionHash}, gasUsed: ${txReceipt.gasUsed}, effectiveGasPrice: ${txReceipt.effectiveGasPrice}`,
			)
		}

		const native = this.tokenUtils.getNative(from.chainId)

		const nativePrice = await this.priceOracleService.getPrice(native)

		const costInUsd = txCostInNative * nativePrice

		return costInUsd
	}
}
