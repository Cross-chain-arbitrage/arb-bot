import { Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../../domain/entities/edge'

@Injectable()
export class PathExecutionTelemetry {
	logger = new Logger(PathExecutionTelemetry.name)

	constructor() {}

	onProcessStepStart(edge: Edge, amountIn: bigint) {
		const log = {
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
		const log = {
			phase: 'process_step',
			attempt: 1,
			amountOut: amountOut.toString(),
			executionCostUsd,
		}
		this.logger.log(log, `Process step succeeded`)
	}

	onProcessStepFailure(edge: Edge, error: unknown) {
		const log = {
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
}
