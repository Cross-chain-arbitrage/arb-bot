import { Injectable } from '@nestjs/common'
import { PathExecutor } from '../path-executor/path-executor'
import { PathExecutorParams } from '../path-executor/types'
import { GraphArbitrageOpportunity } from '../snapshot-opportunity-finder/types'

@Injectable()
export class ArbitrageExecutor {
	constructor(private readonly pathExecutor: PathExecutor) {}

	async execute(opportunity: GraphArbitrageOpportunity) {
		const pathExecutorParams: PathExecutorParams = {
			path: opportunity.path,
			startAmount: opportunity.startAmount,
		}

		const result = await this.pathExecutor.executePath(pathExecutorParams)

		return result
		//TODO: add logging and hooks
	}
}
