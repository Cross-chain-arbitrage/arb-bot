import { getAddress, isAddressEqual, PublicClient } from 'viem'
import { UNIV2_POOL_ABI } from '../../abi/uniV2/pool'
import { UNIV2_ROUTER_ABI } from '../../abi/uniV2/router'
import { createCustomError } from '../../utils/common'
import { PoolCreator } from '../base/PoolCreator'
import { UNIV2_PERIPHERY_CONFIG } from './periphery'
import { UniV2Pool } from './Pool'

async function getToken0AddressUniV2(
	poolAddress: Address,
	client: PublicClient,
) {
	return client.readContract({
		address: poolAddress,
		abi: UNIV2_POOL_ABI,
		functionName: 'token0',
	})
}

export class UniV2PoolCreator extends PoolCreator {
	override readonly customError = createCustomError('UniV2PoolCreatorError')

	override async getToken0Address(
		poolAddress: Address,
		client: PublicClient,
	) {
		return client.readContract({
			address: poolAddress,
			abi: UNIV2_POOL_ABI,
			functionName: 'token0',
		})
	}

	override async getToken1Address(
		poolAddress: Address,
		client: PublicClient,
	) {
		return client.readContract({
			address: poolAddress,
			abi: UNIV2_POOL_ABI,
			functionName: 'token1',
		})
	}

	override async getFactoryAddress(
		poolAddress: Address,
		client: PublicClient,
	) {
		return client.readContract({
			address: poolAddress,
			abi: UNIV2_ROUTER_ABI,
			functionName: 'factory',
		})
	}

	override async isPeripheryValid(
		periphery: {
			router: Address
		},
		poolFactory: Address,
		client: PublicClient,
	) {
		const routerFactoryAddress = await client.readContract({
			address: periphery.router,
			abi: UNIV2_ROUTER_ABI,
			functionName: 'factory',
		})

		return isAddressEqual(routerFactoryAddress, poolFactory)
	}

	override getPeripheryFromCollection(
		chainId: number,
		factory: Address,
	): {
		router: Address
	} {
		return UNIV2_PERIPHERY_CONFIG[chainId]?.[getAddress(factory)]
	}

	override async create(poolAddress: Address, chainId: number) {
		const { periphery, immutables } =
			await this.getPeripheryAndImmutablesSafe(poolAddress, chainId)

		return new UniV2Pool({
			immutables,
			poolAddress,
			chainId,
			routerAddress: periphery.router,
		})
	}
}
