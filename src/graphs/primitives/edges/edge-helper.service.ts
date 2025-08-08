import { Injectable } from '@nestjs/common'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { Hash, TransactionReceipt } from 'viem'
import { ChainClientService } from '../../../chain-client/chain-client.service'
import { GasPriceOracleService } from '../../../gas-price-oracle/gas-price-oracle.service'
import { PriceOracleService } from '../../../modules/price-oracle/price-oracle.service'
import { TokenUtils } from '../../../primitives/tokens/TokenUtils'
import { SolanaClientService } from '../../../solana/solana-client.service'
import { SolanaNative } from '../../../solana/solana-tokens/solana-native'
import { SolanaToken } from '../../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../../solana/solana-tokens/solana-token-utils'
const MICRO_LAMPORTS_PER_LAMPORT = 10n ** 6n
const LAMPORTS_FOR_SIGNING = 5000n

@Injectable()
export class EdgeHelperService {
	constructor(
		private readonly gasPriceOracleService: GasPriceOracleService,
		private readonly priceOracleService: PriceOracleService,
		private readonly tokenUtils: TokenUtils,
		private readonly solanaClientService: SolanaClientService,
		private readonly chainClientService: ChainClientService,
		private readonly solanaTokenUtils: SolanaTokenUtils,
	) {}

	getNative(from: GraphNode) {
		if (from instanceof SolanaToken) {
			return this.solanaTokenUtils.getNative()
		} else {
			return this.tokenUtils.getNative(from.chainId)
		}
	}

	async getExpectedGasCostInUsd(from: GraphNode, gas: bigint) {
		let txCostInNative: bigint

		if (from instanceof SolanaToken) {
			const expectedComputeUnitPrice = 15000n // it depends on the highest account's demand across all accounts in tx

			txCostInNative =
				(expectedComputeUnitPrice * BigInt(gas)) /
					MICRO_LAMPORTS_PER_LAMPORT +
				LAMPORTS_FOR_SIGNING
		} else {
			const gasPrice = await this.gasPriceOracleService.getGasPrice(
				from.chainId,
			)

			txCostInNative = gas * gasPrice
		}

		return this.getExpectedTxCost(from, txCostInNative)
	}

	async getExpectedTxCost(from: GraphNode, txCostInNative: bigint) {
		const native = this.getNative(from)
		const nativePrice = await this.priceOracleService.getPrice(native)

		const costInUsd =
			Number(native.formatUnits(txCostInNative)) * nativePrice

		return costInUsd
	}

	async getAdditionalCostInUsd(
		token: GraphNode | SolanaNative,
		amount: bigint,
	) {
		const additionalCostTokenPrice =
			await this.priceOracleService.getPrice(token)

		const additionalCostInUsd =
			Number(token.formatUnits(amount)) * additionalCostTokenPrice

		return additionalCostInUsd
	}

	async getActualGasCostInUsd(
		from: GraphNode,
		txResult: TransactionReceipt | ParsedTransactionWithMeta,
	) {
		let txCostInNative: bigint

		if (from instanceof SolanaToken) {
			const parsedTx = txResult as ParsedTransactionWithMeta

			const fee = parsedTx.meta?.fee

			if (!fee) {
				throw Error(
					`Meta is not found for tx ${parsedTx.transaction.signatures[0]}`,
				)
			}

			txCostInNative = BigInt(fee)
		} else {
			const txReceipt = txResult as TransactionReceipt

			try {
				// viem returns not bigint for one of the values (probably effectiveGasPrice)
				txCostInNative = txReceipt.gasUsed * txReceipt.effectiveGasPrice
			} catch (e) {
				throw Error(
					`Error calculating tx cost in native for tx ${txReceipt.transactionHash}, gasUsed: ${txReceipt.gasUsed}, effectiveGasPrice: ${txReceipt.effectiveGasPrice}`,
				)
			}
		}

		return this.getExpectedTxCost(from, txCostInNative)
	}

	async getTxResult(
		from: GraphNode,
		txHash: string,
	): Promise<ParsedTransactionWithMeta | TransactionReceipt> {
		if (from instanceof SolanaToken) {
			const parsedTx =
				await this.solanaClientService.connection.getParsedTransaction(
					txHash,
					{
						commitment: 'confirmed',
						maxSupportedTransactionVersion: 0,
					},
				)

			if (!parsedTx) throw new Error('Transaction not found')

			return parsedTx
		} else {
			const publicClient = this.chainClientService.getClient(from.chainId)

			return publicClient.waitForTransactionReceipt({
				hash: txHash as Hash,
			})
		}
	}
}
