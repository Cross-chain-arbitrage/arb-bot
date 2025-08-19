import { Edge, EdgeId } from '../../domain/entities/edge'

/* ======== INCHAIN ======== */

export type InchainConfirmation = {
	amountOut: bigint
	getExecutionCost: () => Promise<{ costInUsd: number }>
}

export type InchainExecution = {
	txId: string
	confirm: () => Promise<InchainConfirmation>
}

export interface InchainActionProvider {
	kind: 'inchain'
	edge: Edge
	execute(amountIn: bigint): Promise<InchainExecution>
}

/* ======== CROSSCHAIN ======== */

export type CrosschainConfirmation = {
	amountOut: bigint
	dstTxId: string
	getExecutionCost: () => Promise<{ costInUsd: number }>
}

export type CrosschainExecution = {
	srcTxId: string
	confirm: () => Promise<CrosschainConfirmation>
}

export interface CrosschainActionProvider {
	kind: 'crosschain'
	edge: Edge
	execute(amountIn: bigint): Promise<CrosschainExecution>
}

/* ======== REGISTRY ======== */

export type Confirmation = InchainConfirmation | CrosschainConfirmation
export type Execution = InchainExecution | CrosschainExecution

export type EdgeActionProvider =
	| InchainActionProvider
	| CrosschainActionProvider

export interface EdgeActionProviderRegistry {
	[edgeId: EdgeId]: EdgeActionProvider
}
