import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { SolanaEvmGraphBuildingHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-graph-building-helper'
import { RELAY_PROTOCOL } from './constants'
import { RelayConfig } from './types'

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
		const relayConfig = this.configService.get<RelayConfig>('relay')

		const { nodes, edges } =
			await this.solanaEvmGraphBuildingHelper.getNodesAndEdgesFromConfig(
				relayConfig?.edges,
				RELAY_PROTOCOL,
			)

		return {
			nodes,
			edges,
		}
	}
}
