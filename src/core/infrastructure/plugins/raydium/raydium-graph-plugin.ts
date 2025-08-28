import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaGraphBuildingUtils } from '../shared-utils/chain-specific/solana/solana-graph-building.utils'
import { RAYDIUM_PROTOCOL } from './raydium-plugin-constants'
import { RaydiumConfig } from './types'

@Injectable()
export class RaydiumGraphPlugin implements GraphPlugin {
	constructor(
		private readonly solanaGraphBuildingUtils: SolanaGraphBuildingUtils,
		private readonly configService: ConfigService,
	) {}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const raydiumConfig = this.configService.get<RaydiumConfig>('raydium')

		const { nodes, edges } =
			await this.solanaGraphBuildingUtils.getNodesAndEdgesFromConfig(
				raydiumConfig?.edges,
				RAYDIUM_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
