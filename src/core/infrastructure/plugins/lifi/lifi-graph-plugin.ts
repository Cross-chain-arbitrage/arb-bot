import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { EvmGraphBuildingHelper } from '../shared/helpers/chain-specific/evm/evm-graph-building-helper'
import { pathToGraphConfig } from '../shared/utils/path-to-config'
import { LIFI_CONFIG_KEY, LIFI_PROTOCOL } from './constants'
import { LifiGraphConfig } from './types'

@Injectable()
export class LifiGraphPlugin implements GraphPlugin {
	constructor(
		private readonly evmGraphBuildingHelper: EvmGraphBuildingHelper,
		private readonly configService: ConfigService,
	) {}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const graphConfig = this.configService.get<LifiGraphConfig>(
			pathToGraphConfig(LIFI_CONFIG_KEY),
		)

		const { nodes, edges } =
			await this.evmGraphBuildingHelper.getNodesAndEdgesFromConfig(
				graphConfig?.edges,
				LIFI_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
