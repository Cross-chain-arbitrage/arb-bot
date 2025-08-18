import { Edge, EdgeId } from '../../domain/entities/edge'

/* ======== INCHAIN ======== */

export type InchainConfirmingResult = {
	amountOut: bigint
	getExecutionCost: () => Promise<{ costInUsd: number }>
}

export type InchainExecutingResult = {
	txId: string
	confirm: () => Promise<InchainConfirmingResult>
}

export interface InchainActionProvider {
	kind: 'inchain'
	edge: Edge
	execute(amountIn: bigint): Promise<InchainExecutingResult>
}

/* ======== CROSSCHAIN ======== */

export type CrosschainConfirmingResult = {
	amountOut: bigint
	dstTxId: string
	getExecutionCost: () => Promise<{ costInUsd: number }>
}

export type CrosschainExecutingResult = {
	srcTxId: string
	confirm: () => Promise<CrosschainConfirmingResult>
}

export interface CrosschainActionProvider {
	kind: 'crosschain'
	edge: Edge
	execute(amountIn: bigint): Promise<CrosschainExecutingResult>
}

/* ======== REGISTRY ======== */

export type EdgeActionProvider =
	| InchainActionProvider
	| CrosschainActionProvider

export interface EdgeActionProviderRegistry {
	[edgeId: EdgeId]: EdgeActionProvider
}
