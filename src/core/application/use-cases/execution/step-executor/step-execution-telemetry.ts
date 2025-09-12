import { Injectable, Logger } from '@nestjs/common'
import {
	Confirmation,
	Execution,
	ExecutionCost,
} from '../../../interfaces/edge-executor'

export interface PhaseLog {
	phase: string
	attempt: number
	label: string
	timestamp: number
}

@Injectable()
export class StepExecutionTelemetry {
	logger = new Logger(StepExecutionTelemetry.name)

	onPhaseFailure(label: string, attempt: number, error: unknown) {
		const log = {
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

	private logConfirmationSuccess(confirmation: Confirmation) {
		if (confirmation.status !== 'success') return

		const log = {
			phase: 'confirm',
			attempt: 1,
			amountOut: confirmation.amountOut.toString(),
			dstTxId:
				'dstTxId' in confirmation ? confirmation.dstTxId : undefined,
		}
		this.logger.log(log, `Confirmation succeeded`)
	}

	private logCostCalculationSuccess(executionCost: ExecutionCost) {
		const log = {
			phase: 'cost_calculation',
			attempt: 1,
			executionCostUsd: executionCost.costInUsd,
		}
		this.logger.log(log, `Cost calculation succeeded`)
	}
	onPhaseStart(label: string, attempt: number) {
		const log = {
			label,
		}
		this.logger.log(log, `Phase started: ${label} (attempt ${attempt})`)
	}

	onPhaseSuccess(label: string, attempt: number, result?: unknown) {
		const log = {
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

		const log = {
			txId,
			phase: 'execute',
		}

		this.logger.log(log, `Edge execution succeeded`)
	}
}
