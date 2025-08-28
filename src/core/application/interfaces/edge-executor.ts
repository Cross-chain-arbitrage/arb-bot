import { Edge } from '../../domain/entities/edge'

/* ======== INCHAIN ======== */

export type InchainConfirmation = {
	amountOut: bigint
	getExecutionCost: () => Promise<{ costInUsd: number }>
}

export type InchainExecution = {
	txId: string
	confirm: () => Promise<InchainConfirmation>
}

export interface InchainExecutor {
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

export interface CrosschainExecutor {
	kind: 'crosschain'
	edge: Edge
	execute(amountIn: bigint): Promise<CrosschainExecution>
}

/* ======== REGISTRY ======== */

export type Confirmation = InchainConfirmation | CrosschainConfirmation
export type Execution = InchainExecution | CrosschainExecution

export type EdgeExecutor = InchainExecutor | CrosschainExecutor

export interface EdgeExecutorRegistry {
	[edgeId: string]: EdgeExecutor
}
