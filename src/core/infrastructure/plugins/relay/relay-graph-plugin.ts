import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaEvmGraphBuildingHelper } from '../shared/helpers/chain-specific/solana-evm/solana-evm-graph-building-helper'
import { pathToGraphConfig } from '../shared/utils/path-to-config'
import { RELAY_CONFIG_KEY, RELAY_PROTOCOL } from './constants'
import { RelayGraphConfig } from './types'

@Injectable()
export class RelayGraphPlugin implements GraphPlugin {
	constructor(
		readonly configService: ConfigService,
		readonly solanaEvmGraphBuildingHelper: SolanaEvmGraphBuildingHelper,
	) {}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const graphConfig = this.configService.get<RelayGraphConfig>(
			pathToGraphConfig(RELAY_CONFIG_KEY),
		)

		const { nodes, edges } =
			await this.solanaEvmGraphBuildingHelper.getNodesAndEdgesFromConfig(
				graphConfig?.edges,
				RELAY_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
