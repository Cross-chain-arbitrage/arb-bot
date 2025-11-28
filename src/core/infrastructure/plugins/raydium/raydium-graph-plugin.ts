import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaGraphBuildingHelper } from '../shared/helpers/chain-specific/solana/solana-graph-building-helper'
import { pathToGraphConfig } from '../shared/utils/path-to-config'
import { RAYDIUM_CONFIG_KEY, RAYDIUM_PROTOCOL } from './constants'
import { RaydiumGraphConfig } from './types'

@Injectable()
export class RaydiumGraphPlugin implements GraphPlugin {
	constructor(
		private readonly solanaGraphBuildingHelper: SolanaGraphBuildingHelper,
		private readonly configService: ConfigService,
	) {}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const graphConfig = this.configService.get<RaydiumGraphConfig>(
			pathToGraphConfig(RAYDIUM_CONFIG_KEY),
		)

		const { nodes, edges } =
			await this.solanaGraphBuildingHelper.getNodesAndEdgesFromConfig(
				graphConfig?.edges,
				RAYDIUM_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
