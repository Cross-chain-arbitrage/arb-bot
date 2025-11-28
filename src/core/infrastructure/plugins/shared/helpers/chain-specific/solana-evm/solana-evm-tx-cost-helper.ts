import { Injectable } from '@nestjs/common'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { TransactionReceipt } from 'viem'
import { ChainIdUtils } from '../../../../../../domain/services/chain-id-utils'
import { ChainId } from '../../../../../../domain/value-objects/chain-id'
import { EvmTxCostHelper } from '../evm/evm-tx-cost-helper'
import { SolanaTxCostHelper } from '../solana/solana-tx-cost-helper'

@Injectable()
export class SolanaEvmTxCostHelper {
	constructor(
		readonly solanaTxCostHelper: SolanaTxCostHelper,
		readonly evmTxCostHelper: EvmTxCostHelper,
	) {}

	async getExpectedTxCostInUsd(
		chainId: ChainId,
		gasOrUnitConsumption: bigint,
	): Promise<number> {
		const { namespace, reference } = ChainIdUtils.parseId(chainId)

		if (namespace === 'solana') {
			return this.solanaTxCostHelper.getExpectedTxCostInUsd(
				gasOrUnitConsumption,
			)
		}

		return this.evmTxCostHelper.getExpectedTxCostInUsd(
			Number(reference),
			gasOrUnitConsumption,
		)
	}

	async getUsdCostOfNativeAmount(
		chainId: ChainId,
		nativeAmount: bigint,
	): Promise<number> {
		const { namespace, reference } = ChainIdUtils.parseId(chainId)

		if (namespace === 'solana') {
			return this.solanaTxCostHelper.getUsdCostOfNativeAmount(
				nativeAmount,
			)
		}

		return this.evmTxCostHelper.getUsdCostOfNativeAmount(
			Number(reference),
			nativeAmount,
		)
	}

	async getTxCostInUsd(
		chainId: ChainId,
		txResult: ParsedTransactionWithMeta | TransactionReceipt,
	) {
		const { namespace, reference } = ChainIdUtils.parseId(chainId)

		if (namespace === 'solana') {
			return this.solanaTxCostHelper.getTxCostInUsd(
				txResult as ParsedTransactionWithMeta,
			)
		}

		return this.evmTxCostHelper.getTxCostInUsd(
			Number(reference),
			txResult as TransactionReceipt,
		)
	}
}
