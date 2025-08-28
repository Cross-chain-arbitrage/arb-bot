import { Inject, Injectable } from '@nestjs/common'
import { Address } from 'viem'
import { Pool } from './base/pool'
import { PoolCreator } from './base/pool-creator'
import { DEX_REGISTRY_TOKEN, DexRegistry } from './dex-registry'

export type PoolType = keyof typeof DexRegistry

export interface PoolCreationParams {
	address: Address
	chainId: number
	type: PoolType
}

@Injectable()
export class PoolUtils {
	poolCache: Map<`${number}:${Address}`, Pool> = new Map()

	constructor(
		@Inject(DEX_REGISTRY_TOKEN)
		private readonly dexRegistry: Record<PoolType, PoolCreator>,
	) {}

	async createPool<T extends Pool = Pool>(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<T> {
		const cachedPool = this.getPoolFromCache(poolAddress, chainId)

		if (cachedPool) return cachedPool as T

		const pool = await this.dexRegistry[poolType].create(
			poolAddress,
			chainId,
		)

		this.setPoolInCache(pool, chainId, poolAddress)

		return pool as T
	}

	async createPools(pools: PoolCreationParams[]): Promise<Pool[]> {
		const poolPromises = pools.map((pool) =>
			this.createPool(pool.address, pool.chainId, pool.type),
		)
		return Promise.all(poolPromises)
	}

	private getPoolFromCache(
		poolAddress: Address,
		chainId: number,
	): Pool | undefined {
		return this.poolCache.get(
			`${chainId}:${poolAddress.toLowerCase() as Address}`,
		)
	}

	private setPoolInCache(pool: Pool, chainId: number, poolAddress: Address) {
		this.poolCache.set(
			`${chainId}:${poolAddress.toLowerCase() as Address}`,
			pool,
		)
	}
}
