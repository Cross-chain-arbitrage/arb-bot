import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaEvmGraphBuildingHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-graph-building-helper'
import { MOCK_CONFIG_KEY } from './configuration/mock-config'
import { MOCK_PROTOCOL } from './constants'
import { MockConfig } from './types'

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
		const mockConfig = this.configService.get<MockConfig>(MOCK_CONFIG_KEY)

		const { nodes, edges } =
			await this.solanaEvmGraphBuildingHelper.getNodesAndEdgesFromConfig(
				mockConfig?.edges,
				MOCK_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
