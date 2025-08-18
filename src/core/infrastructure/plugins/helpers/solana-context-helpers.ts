import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'

const MICRO_LAMPORTS_PER_LAMPORT = 10n ** 6n
const LAMPORTS_FOR_SIGNING = 5000n

export async function getExpectedTxCostInUsd(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		priceOracle: PriceOracle
	},
	unitConsumption: bigint,
) {
	const expectedComputeUnitPrice = 15000n // it depends on the highest account's demand across all accounts in tx

	const txCostInNative =
		(expectedComputeUnitPrice * BigInt(unitConsumption)) /
			MICRO_LAMPORTS_PER_LAMPORT +
		LAMPORTS_FOR_SIGNING

	return getUsdCostOfNativeAmount.bind(this)(txCostInNative)
}

export async function getUsdCostOfNativeAmount(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		priceOracle: PriceOracle
	},
	nativeAmount: bigint,
) {
	const native = this.solanaTokenUtils.getNative()
	const nativePrice = await this.priceOracle.getPrice(native)

	const costInUsd = Number(native.formatUnits(nativeAmount)) * nativePrice

	return costInUsd
}

export async function getTxCostInUsd(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		priceOracle: PriceOracle
	},
	txResult: ParsedTransactionWithMeta,
) {
	const fee = txResult.meta?.fee

	if (!fee) {
		throw Error(
			`Meta is not found for tx ${txResult.transaction.signatures[0]}`,
		)
	}

	const txCostInNative = BigInt(fee)

	return getUsdCostOfNativeAmount.bind(this)(txCostInNative)
}
