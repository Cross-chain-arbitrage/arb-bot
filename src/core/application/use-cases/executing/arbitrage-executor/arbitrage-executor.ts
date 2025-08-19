import { Injectable } from '@nestjs/common'
import { GraphArbitrageOpportunity } from '../../finding/snapshot-opportunity-finder/types'
import { PathExecutor } from '../path-executor/path-executor'
import { PathExecutorParams } from '../path-executor/types'

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
