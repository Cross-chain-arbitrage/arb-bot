import { Address, zeroAddress } from 'viem'
import { ALGEBRA_FACTORY_ABI } from '../abi/algebra/algebraFactory'
import { PoolData } from '../strategies/Strategy'
import { ClientManager } from '../utils/ClientManager'
import { Pool } from './base/Pool'
import { AlgebraPool } from './pools/AlgebraPool'
import { AlgebraV1_9Pool } from './pools/AlgebraV1_9Pool'
import { PancakeV2Pool } from './pools/PancakeV2Pool'
import { PancakeV3Pool } from './pools/PancakeV3Pool'
import { UniV2Pool } from './pools/UniV2Pool'
import { UniV3Pool } from './pools/UniV3Pool'
import { VelodromeV1Pool } from './pools/VelodromeV1'
import { VelodromeV2Pool } from './pools/VelodromeV2Pool'
import { PoolType } from './poolVariety'

export class PoolUtils {
	static async createPool(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<Pool> {
		switch (poolType) {
			case PoolType.ALGEBRA:
				return AlgebraPool.create(poolAddress, chainId)
			case PoolType.UNIV3:
				return UniV3Pool.create(poolAddress, chainId)
			case PoolType.UNIV2:
				return UniV2Pool.create(poolAddress, chainId)
			case PoolType.PANCAKEV2:
				return PancakeV2Pool.create(poolAddress, chainId)
			case PoolType.PANCAKEV3:
				return PancakeV3Pool.create(poolAddress, chainId)
			case PoolType.ALGEBRA_V1_9:
				return AlgebraV1_9Pool.create(poolAddress, chainId)
			case PoolType.VELODROME_V2:
				return VelodromeV2Pool.create(poolAddress, chainId)
			case PoolType.VELODROME_V1:
				return VelodromeV1Pool.create(poolAddress, chainId)
		}
	}

	static async createPools(pools: PoolData[]): Promise<Pool[]> {
		const poolPromises = pools.map((pool) =>
			PoolUtils.createPool(pool.address, pool.chainId, pool.type),
		)
		return Promise.all(poolPromises)
	}

	static async getPoolAddressFromFactory(
		factoryAddress: Address,
		token0Address: Address,
		token1Address: Address,
		chainId: number,
	): Promise<Address | null> {
		const client = ClientManager.getClient(chainId)

		try {
			// Get pool address from factory
			const poolAddress = await client.readContract({
				address: factoryAddress,
				abi: ALGEBRA_FACTORY_ABI,
				functionName: 'poolByPair',
				args: [token0Address, token1Address],
			})

			if (poolAddress === zeroAddress) {
				return null
			}

			return poolAddress
		} catch (error) {
			console.error('Error fetching pool info:', error)
			return null
		}
	}
}
