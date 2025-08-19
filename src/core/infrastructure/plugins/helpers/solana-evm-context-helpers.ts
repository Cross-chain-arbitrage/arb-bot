import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { Hash, TransactionReceipt } from 'viem'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { ChainClientService } from '../../evm/chain-client/chain-client.service'
import { GasPriceOracleService } from '../../evm/gas-price-oracle/gas-price-oracle.service'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { SolanaClientService } from '../../solana/solana-client.service'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import {
	getTxCostInUsd as getEvmTxCostInUsd,
	getExpectedTxCostInUsd as getExpectedEvmTxCostInUsd,
} from './evm-context-helpers'
import {
	getExpectedTxCostInUsd as getExpectedSolanaTxCostInUsd,
	getTxCostInUsd as getSolanaTxCostInUsd,
} from './solana-context-helpers'

export async function getExpectedTxCostInUsd(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		tokenUtils: TokenUtils
		priceOracle: PriceOracle
		gasPriceOracleService: GasPriceOracleService
	},
	chainId: number | 'solana',
	gasOrUnitConsumption: bigint,
): Promise<number> {
	if (chainId === 'solana') {
		return getExpectedSolanaTxCostInUsd.bind(this)(gasOrUnitConsumption)
	}

	return getExpectedEvmTxCostInUsd.bind(this)(chainId, gasOrUnitConsumption)
}

export async function getTxCostInUsd(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		tokenUtils: TokenUtils
		priceOracle: PriceOracle
	},
	chainId: number | 'solana',
	txResult: ParsedTransactionWithMeta | TransactionReceipt,
) {
	if (chainId === 'solana') {
		return getSolanaTxCostInUsd.bind(this)(
			txResult as ParsedTransactionWithMeta,
		)
	}

	return getEvmTxCostInUsd.bind(this)(chainId, txResult as TransactionReceipt)
}

export async function waitForTxResult(
	this: {
		solanaClientService: SolanaClientService
		chainClientService: ChainClientService
	},
	chainId: number | 'solana',
	txId: string,
): Promise<ParsedTransactionWithMeta | TransactionReceipt> {
	if (chainId === 'solana') {
		return this.solanaClientService.waitForParsedTransaction(txId)
	}

	const publicClient = this.chainClientService.getClient(chainId)

	return publicClient.waitForTransactionReceipt({
		hash: txId as Hash,
	})
}
