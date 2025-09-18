---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-quoter-plugin.ts
---
import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'

@Injectable()
export class <%= h.changeCase.pascalCase(name) %>QuoterPlugin implements QuoterPlugin {
	constructor() {}

	buildEdgeQuoter(edge: Edge): EdgeQuoter | Promise<EdgeQuoter> {
		// TODO: Implement edge quoter building logic
		throw new Error('buildEdgeQuoter not implemented')
	}
}
