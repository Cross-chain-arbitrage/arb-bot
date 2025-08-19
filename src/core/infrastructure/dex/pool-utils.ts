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

	async createPools(pools: PoolCreationParams[]): Promise<Pool[]> {
		const poolPromises = pools.map((pool) =>
			this.createPool(pool.address, pool.chainId, pool.type),
		)
		return Promise.all(poolPromises)
	}
}
