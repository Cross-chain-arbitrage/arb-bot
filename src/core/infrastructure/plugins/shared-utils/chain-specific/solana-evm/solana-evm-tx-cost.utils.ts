import { Injectable } from '@nestjs/common'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { TransactionReceipt } from 'viem'
import { PluginHelper } from '../../plugin-helper'
import { EvmPluginHelper } from '../evm/evm-tx-cost.utils'
import { SolanaPluginHelper } from '../solana/solana-tx-cost.utils'

@Injectable()
export class SolanaEvmPluginHelper extends PluginHelper {
	constructor(
		readonly solanaPluginHelper: SolanaPluginHelper,
		readonly evmPluginHelper: EvmPluginHelper,
	) {
		super()
	}

	async getExpectedTxCostInUsd(
		chainId: number | 'solana',
		gasOrUnitConsumption: bigint,
	): Promise<number> {
		if (chainId === 'solana') {
			return this.solanaPluginHelper.getExpectedTxCostInUsd(
				gasOrUnitConsumption,
			)
		}

		return this.evmPluginHelper.getExpectedTxCostInUsd(
			chainId,
			gasOrUnitConsumption,
		)
	}

	async getUsdCostOfNativeAmount(
		chainId: number | 'solana',
		nativeAmount: bigint,
	): Promise<number> {
		if (chainId === 'solana') {
			return this.solanaPluginHelper.getUsdCostOfNativeAmount(
				nativeAmount,
			)
		}

		return this.evmPluginHelper.getUsdCostOfNativeAmount(
			chainId,
			nativeAmount,
		)
	}

	async getTxCostInUsd(
		chainId: number | 'solana',
		txResult: ParsedTransactionWithMeta | TransactionReceipt,
	) {
		if (chainId === 'solana') {
			return this.solanaPluginHelper.getTxCostInUsd(
				txResult as ParsedTransactionWithMeta,
			)
		}

		return this.evmPluginHelper.getTxCostInUsd(
			chainId,
			txResult as TransactionReceipt,
		)
	}
}
