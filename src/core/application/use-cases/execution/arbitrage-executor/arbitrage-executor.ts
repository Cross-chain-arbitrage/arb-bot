import { Injectable } from '@nestjs/common'
import { GraphArbitrageOpportunity } from '../../finding/snapshot-opportunity-finder/types'
import { PathExecutor } from '../path-executor/path-executor'
import { PathExecutorParams } from '../path-executor/types'
import { ArbitrageExecutionTelemetry } from './arbitrage-execution-telemetry'

@Injectable()
export class ArbitrageExecutor {
	constructor(
		private readonly pathExecutor: PathExecutor,
		private readonly telemetry: ArbitrageExecutionTelemetry,
	) {}

	async execute(opportunity: GraphArbitrageOpportunity) {
		this.telemetry.onArbitrageStart(opportunity)

		const pathExecutorParams: PathExecutorParams = {
			path: opportunity.path,
			startAmount: opportunity.startAmount,
		}

		const result = await this.pathExecutor.executePath(pathExecutorParams)

		this.telemetry.onArbitrageEnd(opportunity, result)

		return result
	}
}
