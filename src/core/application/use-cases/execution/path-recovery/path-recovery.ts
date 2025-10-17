import { Inject, Injectable } from '@nestjs/common'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/arbitrage-cycle'
import { TokenId } from '../../../../domain/value-objects/token-id'
import {
	BALANCE_ORACLE_TOKEN,
	BalanceOracle,
} from '../../../interfaces/balance-oracle'
import { PathQuoter } from '../../path-quoter/path-quoter'
import { TokenValuator } from '../../token-valuator/token-valuator'
import { PathExecutor } from '../path-executor/path-executor'
import { PathExecutionResult } from '../path-executor/types'
import { PathRecoveryParams } from './types'

interface RecoveryPathEvaluation {
	path: QuotedPath
	amountOut: bigint
	totalCostUsd: number
}

@Injectable()
export class PathRecovery {
	constructor(
		@Inject(BALANCE_ORACLE_TOKEN)
		private readonly balanceOracle: BalanceOracle,

		private readonly pathExecutor: PathExecutor,
		private readonly tokenValuator: TokenValuator,
		private readonly pathQuoter: PathQuoter,
	) {}

	async attemptRecovery(params: PathRecoveryParams): Promise<{
		pathExecutionResult: PathExecutionResult
		path: QuotedPath
	}> {
		const stuckAmount = await this.getStuckAmount(
			params.originalPath[params.failedStepIndex].edge.from,
			params.minTokenThresholds,
		)

		const recoveryPath = await this.getRecoveryPath(
			params.originalPath[params.failedStepIndex].edge.from,
			params.failedStepIndex,
			params.originalPath,
		)

		const pathExecutionResult = await this.pathExecutor.executePath({
			path: recoveryPath.map((step) => step.edge),
			startAmount: stuckAmount,
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

	private getRecoveryPath(
		stuckToken: Token,
		failedStepIndex: number,
		originalPath: QuotedPath,
	): Promise<QuotedPath> {
		throw new Error('Not implemented')
	}
}
