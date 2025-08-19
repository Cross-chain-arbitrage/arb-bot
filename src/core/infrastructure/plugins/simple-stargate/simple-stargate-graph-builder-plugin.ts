import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphBuilderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { getNodesAndEdgesFromConfig } from '../helpers/graph-builer-helpers'
import { SimpleStargateGraphPlugin } from './simple-stargate-graph-plugin'
import { SimpleStargateConfig } from './types'

@Injectable()
export class SimpleStargateGraphBuilderPlugin
	extends SimpleStargateGraphPlugin
	implements GraphBuilderPlugin
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
