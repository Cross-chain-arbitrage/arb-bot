import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphBuilderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { RaydiumGraphPlugin } from './raydium-graph-plugin'
import { RaydiumConfig } from './types'

@Injectable()
export class RaydiumGraphBuilderPlugin
	extends RaydiumGraphPlugin
	implements GraphBuilderPlugin
{
	constructor(
		private readonly configService: ConfigService,
		private readonly solanaTokenUtils: SolanaTokenUtils,
	) {
		super()
	}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const raydiumConfig = this.configService.get<RaydiumConfig>('raydium')

		const nodes: Node[] = []
		const edges: Edge[] = []

		for (const edgeConstructor of raydiumConfig!.edges) {
			const from = await this.solanaTokenUtils.fromAddress<SolanaToken>(
				edgeConstructor.from,
			)
			const to = await this.solanaTokenUtils.fromAddress<SolanaToken>(
				edgeConstructor.to,
			)

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
