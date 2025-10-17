import { Inject, Injectable } from '@nestjs/common'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { TokenId } from '../../../../domain/value-objects/token-id'
import {
	BALANCE_ORACLE_TOKEN,
	BalanceOracle,
} from '../../../interfaces/balance-oracle'
import { PathFinder } from '../../finding/path-finder/path-finder'
import { PathExecutor } from '../path-executor/path-executor'
import { PathExecutionResult } from '../path-executor/types'
import { PathRecoveryParams } from './types'

@Injectable()
export class PathRecovery {
	constructor(
		@Inject(BALANCE_ORACLE_TOKEN)
		private readonly balanceOracle: BalanceOracle,
		private readonly pathExecutor: PathExecutor,
		private readonly pathFinder: PathFinder,
	) {}

	async attemptRecovery(params: PathRecoveryParams): Promise<{
		pathExecutionResult: PathExecutionResult
		path: QuotedPath<Token>
	}> {
		const stuckAmount = await this.getStuckAmount(
			params.originalPath.quotedStepSequence[params.failedStepIndex].edge
				.from,
			params.minTokenThresholds,
		)

		const recoveryPath = await this.getRecoveryPath(
			params.originalPath.quotedStepSequence[params.failedStepIndex].edge
				.from,
			params.failedStepIndex,
			params.originalPath,
		)

		const pathExecutionResult = await this.pathExecutor.executePath({
			path: {
				stepSequence: recoveryPath.quotedStepSequence.map((step) => ({
					edge: step.edge,
				})),
				startAmount: stuckAmount,
			},
		})

		return {
			pathExecutionResult,
			path: recoveryPath,
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
		const path = await this.pathFinder.findPath(
			stuckToken,
			originalPath.quotedStepSequence[failedStepIndex].edge.to,
			originalPath.startAmount,
		)

		if (!path) {
			throw new Error('Path not found')
		}

		return path
	}
}
