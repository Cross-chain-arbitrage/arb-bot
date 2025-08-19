import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphBuilderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { Pool } from '../../dex/base/pool'
import { PoolUtils } from '../../dex/pool-utils'
import { Token } from '../../evm/primitives/tokens/Token'
import { DexGraphPlugin } from './dex-graph-plugin'
import { DexConfig } from './types'

@Injectable()
export class DexGraphBuilderPlugin
	extends DexGraphPlugin
	implements GraphBuilderPlugin
{
	pools: Pool[] = []

	constructor(
		readonly configService: ConfigService,
		readonly poolUtils: PoolUtils,
	) {
		super()
	}

	async findPossibleNodes(): Promise<Node[]> {
		const config = this.configService.get<DexConfig>('dex')

		this.pools = await this.poolUtils.createPools(config!.pools)

		const nodes: Node[] = []

		this.pools.forEach((pool) => {
			const from = pool.token0
			const to = pool.token1

			nodes.push(from)
			nodes.push(to)
		})

		return nodes
	}

	findPossibleEdges(nodes: Node[]): Promise<Edge[]> {
		const edges: Edge[] = []

		this.pools.forEach((pool) => {
			if (
				this.isTokenInNodes(pool.token0, nodes) &&
				this.isTokenInNodes(pool.token1, nodes)
			) {
				edges.push({
					from: pool.token0,
					to: pool.token1,
					id: `${pool.token0.id}-${pool.token1.id}-${pool.address}-${this.name}`,
				})

				this.edgeIdToPool[edges[edges.length - 1].id] = pool

				edges.push({
					from: pool.token1,
					to: pool.token0,
					id: `${pool.token1.id}-${pool.token0.id}-${pool.address}-${this.name}`,
				})

				this.edgeIdToPool[edges[edges.length - 1].id] = pool
			}
		})

		return Promise.resolve(edges)
	}

	isTokenInNodes(token: Token, nodes: Node[]): boolean {
		return nodes.some((node) => node.id === token.id)
	}
}
