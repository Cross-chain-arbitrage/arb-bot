import { Address } from 'viem'
import { Token } from '../utils/tokens/Token'
import { NativeCurrency } from '../utils/tokens/NativeCurrency'
import { Tx } from '../utils/transactions/Tx'

export interface BridgeTx {
	srcTx: Tx
	dstTx?: Tx
	token: Token | NativeCurrency
	amount: bigint
	waitForBridgeToFinish(): Promise<unknown>
}

export interface Bridge {
	/**
	 * Bridge tokens or native currency to another chain
	 * @param token Token or NativeCurrency to bridge
	 * @param amount Amount to bridge
	 * @param toChainId Destination chain ID
	 * @param recipient Recipient address on destination chain
	 * @param simulateOnly If true, only simulate the transaction without sending it
	 * @returns BridgeTx object containing transaction details
	 */
	bridge(
		token: Token | NativeCurrency,
		amount: bigint,
		toChainId: number,
		recipient: Address,
		simulateOnly?: boolean,
	): Promise<BridgeTx>

	/**
	 * Get bridge fee estimate
	 * @param token Token or NativeCurrency to bridge
	 * @param toChainId Destination chain ID
	 * @param useZro Whether to use ZRO token for fees
	 * @returns Tuple of [nativeFee, zroFee]
	 */
	quote(
		token: Token | NativeCurrency,
		toChainId: number,
		useZro?: boolean,
	): Promise<[bigint, bigint]>
}
