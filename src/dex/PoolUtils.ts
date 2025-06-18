import { Address, zeroAddress } from 'viem'
import { ALGEBRA_FACTORY_ABI } from '../abi/algebra/algebraFactory'
import { ClientManager } from '../utils/ClientManager'
import { AlgebraPool } from './algebra/Pool'
import { PancakeV2Pool } from './pancakeV2/Pool'
import { PancakeV3Pool } from './pancakeV3/Pool'
import { Pool } from './Pool'
import { UniV2Pool } from './uniswapV2/Pool'
import { UniV3Pool } from './uniswapV3/Pool'

export enum PoolType {
	UNIV3 = 'uniV3',
	UNIV2 = 'uniV2',
	PANCAKEV2 = 'pancakeV2',
	PANCAKEV3 = 'pancakeV3',
	ALGEBRA = 'algebra',
	UNKNOWN = 'unknown',
}

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
			default:
				throw new Error('Unknown pool type')
		}
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
