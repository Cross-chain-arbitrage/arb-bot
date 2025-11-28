import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaGraphBuildingHelper } from '../shared/helpers/chain-specific/solana/solana-graph-building-helper'
import { pathToGraphConfig } from '../shared/utils/path-to-config'
import { JUPITER_CONFIG_KEY, JUPITER_PROTOCOL } from './constants'
import { JupiterGraphConfig } from './types'

@Injectable()
export class JupiterGraphPlugin implements GraphPlugin {
	constructor(
		private readonly solanaGraphBuildingHelper: SolanaGraphBuildingHelper,
		private readonly configService: ConfigService,
	) {}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const graphConfig = this.configService.get<JupiterGraphConfig>(
			pathToGraphConfig(JUPITER_CONFIG_KEY),
		)

		const { nodes, edges } =
			await this.solanaGraphBuildingHelper.getNodesAndEdgesFromConfig(
				graphConfig?.edges,
				JUPITER_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
