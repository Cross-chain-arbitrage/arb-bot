---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-action-provider-plugin.ts
---
import { Injectable } from '@nestjs/common'
import { EdgeActionProvider } from '../../../application/interfaces/edge-action-provider'
import { ActionProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { <%= h.changeCase.pascalCase(name) %>GraphPlugin } from './<%= h.changeCase.kebabCase(name) %>-graph-plugin'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>ActionProviderPlugin
	extends <%= h.changeCase.pascalCase(name) %>GraphPlugin
	implements ActionProviderPlugin
{
	constructor() {
		super()
	}

	buildEdgeActionProvider(edge: Edge): EdgeActionProvider {
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
