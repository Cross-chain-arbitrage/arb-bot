import { Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../../domain/entities/edge'
import { Confirmation, Execution } from '../../../interfaces/edge-executor'

export interface PhaseLog {
	phase: string
	attempt: number
	label: string
	timestamp: number
}

export interface ProcessStepLog {
	edgeId: string
	amountIn: string
	attempt: number
	timestamp: number
}

export interface ExecutionLog {
	edgeId?: string
	txId?: string
	amountIn: string
	phase: 'execute' | 'confirm' | 'cost_calculation'
	timestamp: number
}

export interface FailureLog {
	reason: unknown
	phase: string
	attempt: number
	errorType?: string
	errorMessage?: string
	timestamp: number
}

export interface SuccessLog {
	phase: string
	attempt: number
	amountOut?: string
	executionCostUsd?: number
	txId?: string
	dstTxId?: string
	timestamp: number
}

@Injectable()
export class ExecutionTelemetry {
	logger = new Logger(ExecutionTelemetry.name)

	constructor() {}

	private createBaseLog() {
		return {
			timestamp: Date.now(),
		}
	}

	// Phase-level telemetry
	onPhaseStart(label: string, attempt: number) {
		const log: PhaseLog = {
			...this.createBaseLog(),
			phase: 'start',
			attempt,
			label,
		}
		this.logger.log(log, `Phase started: ${label} (attempt ${attempt})`)
	}

	onPhaseSuccess(label: string, attempt: number, result?: unknown) {
		const log: PhaseLog = {
			...this.createBaseLog(),
			phase: 'success',
			attempt,
			label,
		}
		this.logger.log(log, `Phase succeeded: ${label} (attempt ${attempt})`)

		// Handle specific phase types with detailed logging
		if (result) {
			this.handlePhaseSpecificSuccess(label, result)
		}
	}

	private handlePhaseSpecificSuccess(phase: string, result: unknown) {
		switch (phase) {
			case 'edge_execution':
				this.logEdgeExecutionSuccess(result as Execution)
				break
			case 'confirmation':
				this.logConfirmationSuccess(result as Confirmation)
				break
			case 'cost_calculation':
				this.logCostCalculationSuccess(result as { costInUsd: number })
				break
		}
	}

	private logEdgeExecutionSuccess(execution: Execution) {
		const txId = 'txId' in execution ? execution.txId : execution.srcTxId
		const log: ExecutionLog = {
			...this.createBaseLog(),
			txId,
			amountIn: '0', // Not available in this context
			phase: 'execute',
		}
		this.logger.log(log, `Edge execution succeeded`)
	}

	private logConfirmationSuccess(confirmation: Confirmation) {
		if (confirmation.status !== 'success') return

		const log: SuccessLog = {
			...this.createBaseLog(),
			phase: 'confirm',
			attempt: 1,
			amountOut: confirmation.amountOut.toString(),
			dstTxId:
				'dstTxId' in confirmation ? confirmation.dstTxId : undefined,
		}
		this.logger.log(log, `Confirmation succeeded`)
	}

	private logCostCalculationSuccess(executionCost: { costInUsd: number }) {
		const log: SuccessLog = {
			...this.createBaseLog(),
			phase: 'cost_calculation',
			attempt: 1,
			executionCostUsd: executionCost.costInUsd,
		}
		this.logger.log(log, `Cost calculation succeeded`)
	}

	onPhaseFailure(label: string, attempt: number, error: unknown) {
		const log: FailureLog = {
			...this.createBaseLog(),
			phase: label,
			attempt,
			reason: error,
			errorType:
				error instanceof Error ? error.constructor.name : typeof error,
			errorMessage:
				error instanceof Error ? error.message : String(error),
		}
		this.logger.error(log, `Phase failed: ${label} (attempt ${attempt})`)
	}

	// Process step telemetry
	onProcessStepStart(edge: Edge, amountIn: bigint) {
		const log: ProcessStepLog = {
			...this.createBaseLog(),
			edgeId: edge.id,
			amountIn: amountIn.toString(),
			attempt: 1,
		}
		this.logger.log(log, `Process step started`)
	}

	onProcessStepSuccess(
		edge: Edge,
		amountOut: bigint,
		executionCostUsd: number,
	) {
		const log: SuccessLog = {
			...this.createBaseLog(),
			phase: 'process_step',
			attempt: 1,
			amountOut: amountOut.toString(),
			executionCostUsd,
		}
		this.logger.log(log, `Process step succeeded`)
	}

	onProcessStepFailure(edge: Edge, error: unknown) {
		const log: FailureLog = {
			...this.createBaseLog(),
			phase: 'process_step',
			attempt: 1,
			reason: error,
			errorType:
				error instanceof Error ? error.constructor.name : typeof error,
			errorMessage:
				error instanceof Error ? error.message : String(error),
		}
		this.logger.error(log, `Process step failed`)
	}

	// Arbitrage execution telemetry
	onArbitrageEnd(result: unknown) {
		const log = {
			...this.createBaseLog(),
			phase: 'arbitrage_end',
			result,
		}
		this.logger.log(log, `Arbitrage execution ended`)
	}
}
