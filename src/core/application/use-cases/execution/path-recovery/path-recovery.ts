import { Inject, Injectable, Logger } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { PATH_FINDER_TOKEN, PathFinder } from '../../../interfaces/path-finder'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'
import { PathExecutor } from '../path-executor/path-executor'
import { PathRecoveryTelemetry } from './path-recovery-telemetry'
import { PathRecoveryParams, PathRecoveryResult } from './types'

@Injectable()
export class PathRecovery {
	private readonly logger = new Logger(PathRecovery.name)

	constructor(
		private readonly pathExecutor: PathExecutor,

		@Inject(PATH_FINDER_TOKEN)
		private readonly pathFinder: PathFinder,

		@Inject(GRAPH_TOKEN)
		private readonly graph: Graph,

		private readonly telemetry: PathRecoveryTelemetry,
	) {}

	async attemptRecovery(
		params: PathRecoveryParams,
	): Promise<PathRecoveryResult> {
		this.telemetry.onAttemptRecoveryStart(params)

		try {
			const stuckAmount = params.stepAmountIn

			this.logger.log({ stuckAmount }, 'Stuck amount')

			const recoveryPath = await this.getRecoveryPath(
				params.originalPath.quotedStepSequence[params.failedStepIndex]
					.edge.from,
				params.originalPath,
			)

			const pathExecutionResult = await this.pathExecutor.executePath({
				path: {
					stepSequence: recoveryPath.quotedStepSequence.map(
						(step) => ({
							edge: step.edge,
						}),
					),
					startAmount: stuckAmount,
				},
			})

			if (pathExecutionResult.status === 'failed') {
				this.telemetry.onAttemptRecoveryFailure(
					recoveryPath,
					pathExecutionResult,
				)

				return {
					status: 'failed',
					reason: pathExecutionResult.reason,
					failureType: 'execution',
					pathExecutionResult,
					path: recoveryPath,
				}
			}

			this.telemetry.onAttemptRecoverySuccess(
				recoveryPath,
				pathExecutionResult,
			)

			return {
				status: 'success',
				pathExecutionResult,
				path: recoveryPath,
			}
		} catch (error) {
			this.telemetry.onAttemptRecoveryError(error)
			return {
				status: 'failed',
				reason:
					error instanceof Error ? error.message : 'Unknown error',
				failureType: 'preparation',
			}
		}
	}

	private async getRecoveryPath(
		stuckToken: Token,
		originalPath: QuotedPath<Token>,
	): Promise<QuotedPath<Token>> {
		const paths = await this.pathFinder.findPaths(this.graph, [
			{
				startToken: stuckToken,
				endToken: originalPath.quotedStepSequence[0].edge.from,
				startAmount: originalPath.startAmount,
			},
		])

		if (paths === null) {
			throw new Error('Path not found')
		}

		return paths[0] as QuotedPath<Token>
	}
}
