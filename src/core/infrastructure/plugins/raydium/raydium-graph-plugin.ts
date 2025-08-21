import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { RaydiumPlugin } from './raydium-plugin'
import { RaydiumConfig } from './types'

@Injectable()
export class RaydiumGraphPlugin extends RaydiumPlugin implements GraphPlugin {
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

		if (!raydiumConfig) {
			return {
				nodes,
				edges,
			}
		}

		// TODO: create separate service for this
		for (const edgeConstructor of raydiumConfig.edges) {
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
				id: `${from.id}-${to.id}-${this.id}`,
			}

			edges.push(edge)
		}

		return {
			nodes,
			edges,
		}
	}
}
