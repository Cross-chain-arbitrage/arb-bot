---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-snapshot-plugin.ts
---
import { Injectable } from '@nestjs/common'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { <%= h.changeCase.pascalCase(name) %>Plugin } from './<%= h.changeCase.kebabCase(name) %>-graph-plugin'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>SnapshotPlugin
	extends <%= h.changeCase.pascalCase(name) %>Plugin
	implements SnapshotPlugin
{
	constructor() {
		super()
	}

	buildEdgeSnapshotBuilder(edge: Edge): EdgeSnapshotBuilder {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(edge: Edge): Promise<EdgeSnapshotFn> {
		// TODO: Implement snapshot function logic
		throw new Error('buildSnapshotFn not implemented')
	}
} 