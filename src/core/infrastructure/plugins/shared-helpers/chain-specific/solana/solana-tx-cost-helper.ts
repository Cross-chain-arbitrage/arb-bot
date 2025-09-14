import { Inject, Injectable } from '@nestjs/common'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../../../application/interfaces/price-oracle'
import { SolanaClientService } from '../../../../solana/solana-client.service'
import { SolanaTokenUtils } from '../../../../solana/solana-tokens/solana-token-utils'

const MICRO_LAMPORTS_PER_LAMPORT = 10n ** 6n
const LAMPORTS_FOR_SIGNING = 5000n

@Injectable()
export class SolanaTxCostHelper {
	constructor(
		readonly solanaTokenUtils: SolanaTokenUtils,
		@Inject(PRICE_ORACLE_TOKEN) readonly priceOracle: PriceOracle,
		readonly solanaClientService: SolanaClientService,
	) {}

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
}
