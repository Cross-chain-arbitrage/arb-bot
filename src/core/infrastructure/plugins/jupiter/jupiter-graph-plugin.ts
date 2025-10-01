import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaGraphBuildingHelper } from '../shared-helpers/chain-specific/solana/solana-graph-building-helper'
import { JUPITER_CONFIG_KEY } from './configuration/jupiter-config'
import { JUPITER_PROTOCOL } from './constants'
import { JupiterConfig } from './types'

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
		const jupiterConfig =
			this.configService.get<JupiterConfig>(JUPITER_CONFIG_KEY)

		const { nodes, edges } =
			await this.solanaGraphBuildingHelper.getNodesAndEdgesFromConfig(
				jupiterConfig?.edges,
				JUPITER_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
