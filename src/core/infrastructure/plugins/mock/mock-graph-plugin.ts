import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaEvmGraphBuildingHelper } from '../shared/helpers/chain-specific/solana-evm/solana-evm-graph-building-helper'
import { pathToGraphConfig } from '../shared/utils/path-to-config'
import { MOCK_CONFIG_KEY, MOCK_PROTOCOL } from './constants'
import { MockGraphConfig } from './types'

@Injectable()
export class MockGraphPlugin implements GraphPlugin {
	constructor(
		private readonly configService: ConfigService,
		private readonly solanaEvmGraphBuildingHelper: SolanaEvmGraphBuildingHelper,
	) {}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const graphConfig = this.configService.get<MockGraphConfig>(
			pathToGraphConfig(MOCK_CONFIG_KEY),
		)

		const { nodes, edges } =
			await this.solanaEvmGraphBuildingHelper.getNodesAndEdgesFromConfig(
				graphConfig?.edges,
				MOCK_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
