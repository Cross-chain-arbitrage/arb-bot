import { Injectable } from '@nestjs/common'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { SolanaClientService } from '../../solana/solana-client.service'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { PluginHelper } from './plugin-helper'

const MICRO_LAMPORTS_PER_LAMPORT = 10n ** 6n
const LAMPORTS_FOR_SIGNING = 5000n

@Injectable()
export class SolanaPluginHelper extends PluginHelper {
	constructor(
		readonly solanaTokenUtils: SolanaTokenUtils,
		readonly priceOracle: PriceOracle,
		readonly solanaClientService: SolanaClientService,
	) {
		super()
	}

	async getExpectedTxCostInUsd(unitConsumption: bigint): Promise<number> {
		const expectedComputeUnitPrice = 15000n // it depends on the highest account's demand across all accounts in tx

		const txCostInNative =
			(expectedComputeUnitPrice * BigInt(unitConsumption)) /
				MICRO_LAMPORTS_PER_LAMPORT +
			LAMPORTS_FOR_SIGNING

		return this.getUsdCostOfNativeAmount(txCostInNative)
	}

	async getUsdCostOfNativeAmount(nativeAmount: bigint): Promise<number> {
		const native = this.solanaTokenUtils.getNative()
		const nativePrice = await this.priceOracle.getPrice(native)

		const costInUsd = Number(native.formatUnits(nativeAmount)) * nativePrice

		return costInUsd
	}

	async getTxCostInUsd(txResult: ParsedTransactionWithMeta): Promise<number> {
		const fee = txResult.meta?.fee

		if (!fee) {
			throw Error(
				`Meta is not found for tx ${txResult.transaction.signatures[0]}`,
			)
		}

		const txCostInNative = BigInt(fee)

		return this.getUsdCostOfNativeAmount(txCostInNative)
	}

	async waitForParsedTransaction(
		txId: string,
	): Promise<ParsedTransactionWithMeta> {
		// TODO: expand this method with different commitments and test it
		const parsedTx =
			await this.solanaClientService.connection.getParsedTransaction(
				txId,
				{
					commitment: 'finalized',
					maxSupportedTransactionVersion: 0,
				},
			)

		return parsedTx!
	}
}
