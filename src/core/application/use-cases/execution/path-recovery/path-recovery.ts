import { Inject, Injectable, Logger } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { TokenId } from '../../../../domain/value-objects/token-id'
import {
	BALANCE_ORACLE_TOKEN,
	BalanceOracle,
} from '../../../interfaces/balance-oracle'
import { PATH_FINDER_TOKEN, PathFinder } from '../../../interfaces/path-finder'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'
import { PathExecutor } from '../path-executor/path-executor'
import { PathRecoveryTelemetry } from './path-recovery-telemetry'
import { PathRecoveryParams, PathRecoveryResult } from './types'

@Injectable()
export class PathRecovery {
	private readonly logger = new Logger(PathRecovery.name)

	constructor(
		@Inject(BALANCE_ORACLE_TOKEN)
		private readonly balanceOracle: BalanceOracle,
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
			const stuckAmount = await this.getStuckAmount(
				params.originalPath.quotedStepSequence[params.failedStepIndex]
					.edge.from,
				params.minTokenThresholds,
			)

			this.logger.log({ stuckAmount }, 'Stuck amount')

			const recoveryPath = await this.getRecoveryPath(
				params.originalPath.quotedStepSequence[params.failedStepIndex]
					.edge.from,
				params.failedStepIndex,
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

	private async getStuckAmount(
		stuckToken: Token,
		minTokenThresholds: Map<TokenId, number>,
	): Promise<bigint> {
		const [{ balance }] = await this.balanceOracle.getBalances([stuckToken])

		const thresholdFormatted = minTokenThresholds.get(stuckToken.id) || 0
		const threshold = stuckToken.parseUnits(thresholdFormatted.toString())

		if (balance <= threshold) {
			throw new Error(
				`Stuck amount (${balance}) is less than or equal to threshold (${threshold}) for token ${stuckToken.id}`,
			)
		}

		const stuckAmount = balance - threshold

		return stuckAmount
	}

	private async getRecoveryPath(
		stuckToken: Token,
		failedStepIndex: number,
		originalPath: QuotedPath<Token>,
	): Promise<QuotedPath<Token>> {
		const paths = await this.pathFinder.findPaths(this.graph, [
			{
				startToken: stuckToken,
				endToken:
					originalPath.quotedStepSequence[failedStepIndex].edge.to,
				startAmount: originalPath.startAmount,
			},
		])

		if (paths === null) {
			throw new Error('Path not found')
		}

		return paths[0] as QuotedPath<Token>
	}
}
