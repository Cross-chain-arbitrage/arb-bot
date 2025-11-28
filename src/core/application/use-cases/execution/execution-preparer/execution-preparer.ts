import { Inject, Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../../domain/entities/edge'
import {
	EXECUTORS_REGISTRY_TOKEN,
	ExecutorsRegistry,
} from '../../../interfaces/edge-executor'

@Injectable()
export class ExecutionPreparer {
	logger = new Logger(ExecutionPreparer.name)

	constructor(
		@Inject(EXECUTORS_REGISTRY_TOKEN)
		private readonly edgeExecutorRegistry: ExecutorsRegistry,
	) {}

	async prepareExecution(edge: Edge) {
		const edgeExecutor = this.edgeExecutorRegistry.get(edge.id)

		if (!edgeExecutor) {
			throw new Error(`Edge executor not found for edge ${edge.id}`)
		}

		if (!edgeExecutor.prepareExecution) return

		const result = await edgeExecutor.prepareExecution(edge)

		this.logger.log({ result, edgeId: edge.id }, 'Prepared execution')
	}
}
