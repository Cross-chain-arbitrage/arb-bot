import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { EvmGraphBuildingHelper } from '../shared-helpers/chain-specific/evm/evm-graph-building-helper'
import { LIFI_CONFIG_KEY } from './configuration/lifi-config'
import { LIFI_PROTOCOL } from './constants'
import { LifiConfig } from './types'

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
		const lifiConfig = this.configService.get<LifiConfig>(LIFI_CONFIG_KEY)

		const { nodes, edges } =
			await this.evmGraphBuildingHelper.getNodesAndEdgesFromConfig(
				lifiConfig?.edges,
				LIFI_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
