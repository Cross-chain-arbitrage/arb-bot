---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-executor-plugin.ts
---
import { Injectable } from '@nestjs/common'
import { EdgeExecutor } from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>ExecutorPlugin implements ExecutorPlugin {
	constructor() {}

	async buildEdgeExecutor(edge: Edge): Promise<EdgeExecutor> {
		// TODO: Implement edge executor building logic
		throw new Error('buildEdgeExecutor not implemented')
	}
}
