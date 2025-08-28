import { Edge } from '../../domain/entities/edge'

/* ======== INCHAIN ======== */

export type InchainConfirmation = {
	getExecutionCost: () => Promise<{ costInUsd: number }>
} & (
	| {
			status: 'success'
			amountOut: bigint
	  }
	| {
			status: 'failure'
			reason: string
	  }
)

export type InchainExecution = {
	txId: string
	confirm: () => Promise<InchainConfirmation>
}

export type InchainExecutor = {
	kind: 'inchain'
	edge: Edge
	execute(amountIn: bigint): Promise<InchainExecution>
}

/* ======== CROSSCHAIN ======== */

export type CrosschainConfirmation = {
	getExecutionCost: () => Promise<{ costInUsd: number }>
} & (
	| {
			status: 'success'
			dstTxId: string
			amountOut: bigint
	  }
	| {
			status: 'failure'
			reason: string
	  }
)

export type CrosschainExecution = {
	srcTxId: string
	confirm: () => Promise<CrosschainConfirmation>
}

export type CrosschainExecutor = {
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
