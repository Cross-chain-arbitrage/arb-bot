import { Injectable } from '@nestjs/common'
import { Hash } from 'viem'
import { TransactionReceipt } from 'viem/_types/types/transaction'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { ChainClientService } from '../../evm/chain-client/chain-client.service'
import { GasPriceOracleService } from '../../evm/gas-price-oracle/gas-price-oracle.service'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { PluginHelper } from './plugin-helper'

@Injectable()
export class EvmPluginHelper extends PluginHelper {
	constructor(
		readonly gasPriceOracleService: GasPriceOracleService,
		readonly tokenUtils: TokenUtils,
		readonly priceOracle: PriceOracle,
		readonly chainClientService: ChainClientService,
	) {
		super()
	}

	async waitForTransactionReceipt(
		chainId: number,
		txHash: Hash,
	): Promise<TransactionReceipt> {
		const client = this.chainClientService.getClient(chainId)

		return client.waitForTransactionReceipt({ hash: txHash })
	}

	async getExpectedTxCostInUsd(
		chainId: number,
		gas: bigint,
	): Promise<number> {
		const gasPrice = await this.gasPriceOracleService.getGasPrice(chainId)

		const txCostInNative = gas * gasPrice

		const txCostInUsd = await this.getUsdCostOfNativeAmount(
			chainId,
			txCostInNative,
		)

		return txCostInUsd
	}

	async getUsdCostOfNativeAmount(
		chainId: number,
		nativeAmount: bigint,
	): Promise<number> {
		const native = this.tokenUtils.getNative(chainId)
		const nativePrice = await this.priceOracle.getPrice(native)

		const costInUsd = Number(native.formatUnits(nativeAmount)) * nativePrice

		return costInUsd
	}

	async getTxCostInUsd(
		chainId: number,
		txResult: TransactionReceipt,
	): Promise<number> {
		const txCostInNative = txResult.gasUsed * txResult.effectiveGasPrice

		const txCostInUsd = await this.getUsdCostOfNativeAmount(
			chainId,
			txCostInNative,
		)

		return txCostInUsd
	}
}
