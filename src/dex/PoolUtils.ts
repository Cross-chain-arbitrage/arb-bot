import { Address } from 'viem'
import { PoolData } from '../strategies/Strategy'
import { Pool } from './base/Pool'
import { DexRegistry } from './poolVariety'

export type PoolType = keyof typeof DexRegistry

export class PoolUtils {
	static async createPool<T extends Pool = Pool>(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<T> {
		const pool = await DexRegistry[poolType].create(poolAddress, chainId)

		return pool as T
	}

	static async createPools(pools: PoolData[]): Promise<Pool[]> {
		const poolPromises = pools.map((pool) =>
			PoolUtils.createPool(pool.address, pool.chainId, pool.type),
		)
		return Promise.all(poolPromises)
	}
}
