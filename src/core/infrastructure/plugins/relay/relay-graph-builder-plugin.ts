import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphBuilderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { getNode } from '../helpers/graph-builer-helpers'
import { RelayGraphPlugin } from './relay-graph-plugin'
import { RelayConfig } from './types'

@Injectable()
export class RelayGraphBuilderPlugin
	extends RelayGraphPlugin
	implements GraphBuilderPlugin
{
	constructor(
		readonly configService: ConfigService,
		readonly solanaTokenUtils: SolanaTokenUtils,
		readonly tokenUtils: TokenUtils,
	) {
		super()
	}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const relayConfig = this.configService.get<RelayConfig>('relay')

		const nodes: Node[] = []
		const edges: Edge[] = []

		for (const edgeConstructor of relayConfig!.edges) {
			const from = await getNode.bind(this)(edgeConstructor.from)
			const to = await getNode.bind(this)(edgeConstructor.to)

			nodes.push(from, to)

			const edge = {
				from,
				to,
				id: `${from.id}-${to.id}-${this.name}`,
			}

			edges.push(edge)
		}

		return {
			nodes,
			edges,
		}
	}
}
