import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { getNodesAndEdgesFromConfig } from '../shared-utils/graph-building.utils'
import { SimpleStargatePlugin } from './simple-stargate-plugin'
import { SimpleStargateConfig } from './types'

@Injectable()
export class SimpleStargateGraphPlugin
	extends SimpleStargatePlugin
	implements GraphPlugin
{
	constructor(
		readonly configService: ConfigService,
		readonly solanaTokenUtils: SolanaTokenUtils,
		readonly tokenUtils: TokenUtils,
	) {
		super()
	}

	async getDeterminedNodesAndEdges(): Promise<{
		nodes: Node[]
		edges: Edge[]
	}> {
		const simpleStargateConfig =
			this.configService.get<SimpleStargateConfig>('simpleStargate')

		const { nodes, edges } = await getNodesAndEdgesFromConfig.bind(this)(
			simpleStargateConfig!,
		)

		return {
			nodes,
			edges,
		}
	}
}
