import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { Pool } from '../../dex/base/pool'
import { PoolUtils } from '../../dex/pool-utils'
import { Token } from '../../evm/primitives/tokens/Token'
import { DEX_CONFIG_KEY } from './configuration/dex-config'
import { DexPlugin } from './dex-plugin'
import { EdgeToPoolRegistry } from './edge-to-pool-registry'
import { DexConfig } from './types'

@Injectable()
export class DexGraphPlugin extends DexPlugin implements GraphPlugin {
	pools: Pool[] = []

	constructor(
		readonly configService: ConfigService,
		readonly poolUtils: PoolUtils,
		readonly edgeToPoolRegistry: EdgeToPoolRegistry,
	) {
		super()
	}

	async findPossibleNodes(): Promise<Node[]> {
		const config = this.configService.get<DexConfig>(DEX_CONFIG_KEY)

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
					id: `${pool.token0.id}-${pool.token1.id}-${pool.address}-${this.id}`,
				})

				this.edgeToPoolRegistry.registerEdge(
					edges[edges.length - 1],
					pool,
				)

				edges.push({
					from: pool.token1,
					to: pool.token0,
					id: `${pool.token1.id}-${pool.token0.id}-${pool.address}-${this.id}`,
				})

				this.edgeToPoolRegistry.registerEdge(
					edges[edges.length - 1],
					pool,
				)
			}
		})

		return Promise.resolve(edges)
	}

	isTokenInNodes(token: Token, nodes: Node[]): boolean {
		return nodes.some((node) => node.id === token.id)
	}
}
