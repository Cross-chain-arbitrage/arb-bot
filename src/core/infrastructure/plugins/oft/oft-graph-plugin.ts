import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { EvmGraphBuildingHelper } from '../shared/helpers/chain-specific/evm/evm-graph-building-helper'
import { pathToGraphConfig } from '../shared/utils/path-to-config'
import { OFT_CONFIG_KEY, OFT_PROTOCOL } from './constants'
import { OftGraphConfig } from './types'

@Injectable()
export class OftGraphPlugin implements GraphPlugin {
	constructor(
		private readonly evmGraphBuildingHelper: EvmGraphBuildingHelper,
		private readonly configService: ConfigService,
	) {}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const graphConfig = this.configService.get<OftGraphConfig>(
			pathToGraphConfig(OFT_CONFIG_KEY),
		)

		const { nodes, edges } =
			await this.evmGraphBuildingHelper.getNodesAndEdgesFromConfig(
				graphConfig?.edges,
				OFT_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
