import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { isAddressEqual } from 'viem'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { ChannelIdUtils } from '../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../domain/services/edge-id-utils'
import { Pool } from '../../dex/base/pool'
import { PoolType, PoolUtils } from '../../dex/pool-utils'
import { Token } from '../../evm/primitives/tokens/Token'
import { DEX_CONFIG_KEY } from './configuration/dex-config'
import { DexPlugin } from './dex-plugin'
import { DexConfig } from './types'

@Injectable()
export class DexGraphPlugin extends DexPlugin implements GraphPlugin {
	pools: Pool[] = []

	constructor(configService: ConfigService, poolUtils: PoolUtils) {
		super(poolUtils, configService)
	}

	async findPossibleNodes(): Promise<Node[]> {
		const config = this.configService.get<DexConfig>(DEX_CONFIG_KEY)

		if (!config) return []

		this.pools = await this.poolUtils.createPools(config.pools)

		const nodes: Node[] = []

		this.pools.forEach((pool) => {
			nodes.push(pool.token0)
			nodes.push(pool.token1)
		})

		return nodes
	}

	/**
	 * This method doesn't consider the argument (nodes), because it's difficult to build all possible edges from all nodes.
	 * Call findPossibleNodes to make it work properly.
	 * @param nodes - unused argument required by the interface
	 */
	findPossibleEdges(nodes: Node[]): Promise<Edge[]> {
		const edges: Edge[] = []

		this.pools.forEach((pool) => {
			if (
				this.isTokenInNodes(pool.token0, nodes) &&
				this.isTokenInNodes(pool.token1, nodes)
			) {
				const poolType = this.getPoolType(pool)

				edges.push(
					this.createEdge(
						pool.token0,
						pool.token1,
						poolType,
						pool.address,
					),
				)

				edges.push(
					this.createEdge(
						pool.token1,
						pool.token0,
						poolType,
						pool.address,
					),
				)
			}
		})

		return Promise.resolve(edges)
	}

	getPoolType(pool: Pool): PoolType {
		const config = this.configService.get<DexConfig>(DEX_CONFIG_KEY)

		if (!config) {
			throw new Error('DEX config not found')
		}
		const poolCreationParams = config.pools.find(
			(poolCreationParams) =>
				poolCreationParams.chainId === pool.chainId &&
				isAddressEqual(poolCreationParams.address, pool.address),
		)

		if (!poolCreationParams) {
			throw new Error(`Pool ${pool.address} not found in config`)
		}

		return poolCreationParams.type
	}

	createEdge(
		from: Token,
		to: Token,
		poolType: PoolType,
		poolAddress: Address,
	): Edge {
		return {
			from,
			to,
			id: EdgeIdUtils.generateId(
				ChannelIdUtils.generateId(poolType, poolAddress),
				from.id,
				to.id,
			),
		}
	}

	isTokenInNodes(token: Token, nodes: Node[]): boolean {
		return nodes.some((node) => node.id === token.id)
	}
}
