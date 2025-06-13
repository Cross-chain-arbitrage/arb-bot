import { Address } from 'viem'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { Tx } from '../primitives/transactions/Tx'

export interface BridgeTx {
	srcTx: Tx
	dstTx?: Tx
	srcToken: Token | NativeCurrency
	dstToken: Token | NativeCurrency
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
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amountIn: bigint,
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
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amountIn: bigint,
	): Promise<[bigint, bigint]>
}
