import { Injectable, Logger } from '@nestjs/common'
import { StepPhase } from './types'

@Injectable()
export class StepExecutionTelemetry {
	logger = new Logger(StepExecutionTelemetry.name)

	onPhaseError(phase: StepPhase, attempt: number, error: unknown) {
		this.logger.error(error, `Phase failed: ${phase} (attempt ${attempt})`)
	}

	onPhaseStart(phase: StepPhase, attempt: number) {
		const log = {
			phase,
			attempt,
		}

		this.logger.log(log, `Phase started: ${phase} (attempt ${attempt})`)
	}

	onPhaseSuccess(phase: StepPhase, attempt: number, result?: unknown) {
		const log = {
			attempt,
			phase,
			result,
		}

		this.logger.log(log, `Phase succeeded: ${phase} (attempt ${attempt})`)
	}
}
