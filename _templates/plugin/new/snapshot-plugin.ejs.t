---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-snapshot-plugin.ts
---
import { Injectable } from '@nestjs/common'
import { EdgeSnapshotBuilder } from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>SnapshotPlugin implements SnapshotPlugin {
	constructor() {}

	async buildEdgeSnapshotBuilder(edge: Edge): Promise<EdgeSnapshotBuilder> {
		// TODO: Implement edge snapshot builder logic
		throw new Error('buildEdgeSnapshotBuilder not implemented')
	}
} 