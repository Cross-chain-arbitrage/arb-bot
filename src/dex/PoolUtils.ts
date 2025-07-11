import { Address } from 'viem'
import { PoolData } from '../strategies/Strategy'
import { Pool } from './base/Pool'
import { DexRegistry } from './poolVariety'

export type PoolType = keyof typeof DexRegistry

export class PoolUtils {
	static async createPool(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<Pool> {
		return DexRegistry[poolType].create(poolAddress, chainId)
		// switch (poolType) {
		// 	case PoolType.ALGEBRA:
		// 		return AlgebraPool.create(poolAddress, chainId)
		// 	case PoolType.UNIV3:
		// 		return UniV3Pool.create(poolAddress, chainId)
		// 	case PoolType.UNIV2:
		// 		return UniV2Pool.create(poolAddress, chainId)
		// 	case PoolType.PANCAKEV2:
		// 		return PancakeV2Pool.create(poolAddress, chainId)
		// 	case PoolType.PANCAKEV3:
		// 		return PancakeV3Pool.create(poolAddress, chainId)
		// 	case PoolType.ALGEBRA_V1_9:
		// 		return AlgebraV1_9Pool.create(poolAddress, chainId)
		// 	case PoolType.VELODROME_V2:
		// 		return VelodromeV2Pool.create(poolAddress, chainId)
		// 	case PoolType.VELODROME_V1:
		// 		return VelodromeV1Pool.create(poolAddress, chainId)
		// }
	}

	static async createPools(pools: PoolData[]): Promise<Pool[]> {
		const poolPromises = pools.map((pool) =>
			PoolUtils.createPool(pool.address, pool.chainId, pool.type),
		)
		return Promise.all(poolPromises)
	}
}
