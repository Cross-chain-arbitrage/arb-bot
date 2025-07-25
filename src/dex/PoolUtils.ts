import { Inject, Injectable } from '@nestjs/common'
import { Address } from 'viem'
import { PoolData } from '../strategies/Strategy'
import { Pool } from './base/Pool'
import { PoolCreator } from './base/PoolCreator'
import { DEX_REGISTRY_TOKEN, DexRegistry } from './DexRegistry'

export type PoolType = keyof typeof DexRegistry

@Injectable()
export class PoolUtils {
	constructor(
		@Inject(DEX_REGISTRY_TOKEN)
		private readonly dexRegistry: Record<PoolType, PoolCreator>,
	) {}

	async createPool<T extends Pool = Pool>(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<T> {
		const pool = await this.dexRegistry[poolType].create(
			poolAddress,
			chainId,
		)

		return pool as T
	}

	async createPools(pools: PoolData[]): Promise<Pool[]> {
		const poolPromises = pools.map((pool) =>
			this.createPool(pool.address, pool.chainId, pool.type),
		)
		return Promise.all(poolPromises)
	}
}
