import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaGraphBuildingHelper } from '../shared-helpers/chain-specific/solana/solana-graph-building-helper'
import { RAYDIUM_CONFIG_KEY } from './configuration/raydium-config'
import { RAYDIUM_PROTOCOL } from './constants'
import { RaydiumConfig } from './types'

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
		const raydiumConfig =
			this.configService.get<RaydiumConfig>(RAYDIUM_CONFIG_KEY)

		const { nodes, edges } =
			await this.solanaGraphBuildingHelper.getNodesAndEdgesFromConfig(
				raydiumConfig?.edges,
				RAYDIUM_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
