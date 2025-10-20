import { Injectable, Logger } from '@nestjs/common'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import {
	FailedPathExecutionResult,
	SuccessPathExecutionResult,
} from '../path-executor/types'
import { PathRecoveryParams } from './types'

@Injectable()
export class PathRecoveryTelemetry {
	logger = new Logger(PathRecoveryTelemetry.name)

	constructor() {}

	onAttemptRecoveryStart(params: PathRecoveryParams) {
		this.logger.log(params, 'Attempt recovery started')
	}

	onAttemptRecoveryFailure(
		path: QuotedPath<Token>,
		pathExecutionResult: FailedPathExecutionResult,
	) {
		this.logger.error(
			{ path, pathExecutionResult },
			'Attempt recovery failed',
		)
	}

	onAttemptRecoverySuccess(
		path: QuotedPath<Token>,
		pathExecutionResult: SuccessPathExecutionResult,
	) {
		this.logger.log(
			{ path, pathExecutionResult },
			'Attempt recovery succeeded',
		)
	}

	onAttemptRecoveryError(error: unknown) {
		this.logger.error(error, 'Attempt recovery error')
	}
}
