import { Edge } from '../../domain/entities/edge'
import { EdgeId } from '../../domain/value-objects/edge-id'

export type ExecutionCost = { costInUsd: number }

/* ======== INCHAIN ======== */

export type InchainConfirmation = {
	getExecutionCost: () => Promise<ExecutionCost>
} & (
	| {
			status: 'success'
			amountOut: bigint
	  }
	| {
			status: 'failed'
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
	prepareExecution?(edge: Edge): Promise<{ result: string }>
}

/* ======== CROSSCHAIN ======== */

export type CrosschainConfirmation = {
	getExecutionCost: () => Promise<ExecutionCost>
} & (
	| {
			status: 'success'
			dstTxId: string
			amountOut: bigint
	  }
	| {
			status: 'failed'
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
	prepareExecution?(edge: Edge): Promise<{ result: string }>
}
/* ======== HOLISTIC ======== */

export type Confirmation = InchainConfirmation | CrosschainConfirmation
export type Execution = InchainExecution | CrosschainExecution

export type EdgeExecutor = InchainExecutor | CrosschainExecutor

/* ======== REGISTRY ======== */

export type ExecutorsRegistry = Map<EdgeId, EdgeExecutor>

export const EXECUTORS_REGISTRY_TOKEN = Symbol('EXECUTORS_REGISTRY_TOKEN')
