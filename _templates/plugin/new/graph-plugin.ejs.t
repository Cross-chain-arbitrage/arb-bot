---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-graph-plugin.ts
---
import { Injectable } from '@nestjs/common'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>GraphPlugin implements GraphPlugin {
	constructor() {}

	async findPossibleNodes(): Promise<Node[]> {
		// TODO: Implement node discovery logic
		throw new Error('findPossibleNodes not implemented')
	}

	async findPossibleEdges(nodes: Node[]): Promise<Edge[]> {
		// TODO: Implement edge discovery logic
		throw new Error('findPossibleEdges not implemented')
	}
} 