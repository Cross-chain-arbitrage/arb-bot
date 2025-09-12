import { Inject, Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../../domain/entities/edge'
import { EdgeExecutorRegistry } from '../../../interfaces/edge-executor'
import { EDGE_EXECUTOR_REGISTRY_TOKEN } from '../edge-executor-registry-token'

@Injectable()
export class ExecutionPreparer {
	logger = new Logger(ExecutionPreparer.name)

	constructor(
		@Inject(EDGE_EXECUTOR_REGISTRY_TOKEN)
		private readonly edgeExecutorRegistry: EdgeExecutorRegistry,
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
