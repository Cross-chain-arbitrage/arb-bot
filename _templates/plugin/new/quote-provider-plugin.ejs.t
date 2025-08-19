---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-quote-provider-plugin.ts
---
import { Injectable } from '@nestjs/common'
import {
	EdgeQuoteProvider,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-quote-provider'
import { QuoteProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { <%= h.changeCase.pascalCase(name) %>GraphPlugin } from './<%= h.changeCase.kebabCase(name) %>-graph-plugin'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>QuoteProviderPlugin
	extends <%= h.changeCase.pascalCase(name) %>GraphPlugin
	implements QuoteProviderPlugin
{
	constructor() {
		super()
	}

	buildEdgeQuoteProvider(edge: Edge): EdgeQuoteProvider {
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