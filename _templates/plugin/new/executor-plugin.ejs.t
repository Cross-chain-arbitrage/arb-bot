---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-executor-plugin.ts
---
import { Injectable } from '@nestjs/common'
import { EdgeExecutor } from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { <%= h.changeCase.pascalCase(name) %>Plugin } from './<%= h.changeCase.kebabCase(name) %>-graph-plugin'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>ExecutorPlugin
	extends <%= h.changeCase.pascalCase(name) %>Plugin
	implements ExecutorPlugin
{
	constructor() {
		super()
	}

	buildEdgeExecutor(edge: Edge): EdgeExecutor {
		return {
			kind: '',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(edge: Edge): Promise<void> {
		// TODO: Implement execution logic
		throw new Error('execute not implemented')
	}
}
