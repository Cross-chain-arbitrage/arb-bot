---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-graph-builder-plugin.ts
---
import { Injectable } from '@nestjs/common'
import { GraphBuilderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { <%= h.changeCase.pascalCase(name) %>GraphPlugin } from './<%= h.changeCase.kebabCase(name) %>-graph-plugin'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>GraphBuilderPlugin
	extends <%= h.changeCase.pascalCase(name) %>GraphPlugin
	implements GraphBuilderPlugin
{
	constructor() {
		super()
	}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		// TODO: Implement graph building logic
		throw new Error('getDeterminedNodesAndEdges not implemented')
	}
} 