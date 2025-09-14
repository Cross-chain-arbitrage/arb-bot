import { Injectable } from '@nestjs/common'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { TransactionReceipt } from 'viem'
import { EvmTxCostHelper } from '../evm/evm-tx-cost-helper'
import { SolanaTxCostHelper } from '../solana/solana-tx-cost-helper'

@Injectable()
export class SolanaEvmTxCostHelper {
	constructor(
		readonly solanaTxCostHelper: SolanaTxCostHelper,
		readonly evmTxCostHelper: EvmTxCostHelper,
	) {}

	async getExpectedTxCostInUsd(
		chainId: number | 'solana',
		gasOrUnitConsumption: bigint,
	): Promise<number> {
		if (chainId === 'solana') {
			return this.solanaTxCostHelper.getExpectedTxCostInUsd(
				gasOrUnitConsumption,
			)
		}

		return this.evmTxCostHelper.getExpectedTxCostInUsd(
			chainId,
			gasOrUnitConsumption,
		)
	}

	async getUsdCostOfNativeAmount(
		chainId: number | 'solana',
		nativeAmount: bigint,
	): Promise<number> {
		if (chainId === 'solana') {
			return this.solanaTxCostHelper.getUsdCostOfNativeAmount(
				nativeAmount,
			)
		}

		return this.evmTxCostHelper.getUsdCostOfNativeAmount(
			chainId,
			nativeAmount,
		)
	}

	async getTxCostInUsd(
		chainId: number | 'solana',
		txResult: ParsedTransactionWithMeta | TransactionReceipt,
	) {
		if (chainId === 'solana') {
			return this.solanaTxCostHelper.getTxCostInUsd(
				txResult as ParsedTransactionWithMeta,
			)
		}

		return this.evmTxCostHelper.getTxCostInUsd(
			chainId,
			txResult as TransactionReceipt,
		)
	}
}
