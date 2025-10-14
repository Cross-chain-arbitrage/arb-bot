import { Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../../domain/entities/edge'
import { StepProcessingResult } from './types'

@Injectable()
export class PathExecutionTelemetry {
	logger = new Logger(PathExecutionTelemetry.name)

	constructor() {}

	onProcessStepStart(edge: Edge, amountIn: bigint, attempt: number) {
		const log = {
			edgeId: edge.id,
			amountIn: amountIn.toString(),
			attempt,
		}
		this.logger.log(log, `Process step started`)
	}

	onProcessStepSuccess(edge: Edge, amountOut: bigint, attempt: number) {
		const log = {
			phase: 'process_step',
			attempt,
			amountOut: amountOut.toString(),
		}
		this.logger.log(log, `Process step succeeded`)
	}

	onProcessStepFailure(edge: Edge, reason: string, attempt: number) {
		const log = {
			phase: 'process_step',
			attempt,
			reason: reason,
		}
		this.logger.error(log, `Process step failed`)
	}

	onStepCostSuccess(stepResult: StepProcessingResult, costInUsd: number) {
		const log = {
			edgeId: stepResult.step.edge.id,
			costInUsd,
			processingAttempt: stepResult.attempt,
		}
		this.logger.log(log)
	}
	onStepCostFailure(stepResult: StepProcessingResult, error: Error) {
		const log = {
			edgeId: stepResult.step.edge.id,
			processingAttempt: stepResult.attempt,
		}
		//TODO: I want to see log like object and don't want to print 2 logs
		this.logger.error(error, log)
	}
}
