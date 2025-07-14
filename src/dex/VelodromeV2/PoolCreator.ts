import { getAddress, PublicClient } from 'viem'
import { VELODROME_V2_FACTORY_ABI } from '../../abi/velodrome/velodromeV2Factory'
import { VELODROME_V2_POOL_ABI } from '../../abi/velodrome/velodromeV2Pool'
import { ClientManager } from '../../utils/ClientManager'
import {
	callFactoryFunction,
	callToken0Function,
	callToken1Function,
	isContractFactoryMatch,
} from '../base/bricks/commonBricks'
import { Pool, PoolConstructorParams } from '../base/Pool'
import { PoolCreator } from '../base/PoolCreator'
import { VELODROME_V2_PERIPHERY } from './periphery'
import { VelodromeV2Pool } from './Pool'

export class VelodromeV2PoolCreator extends PoolCreator {
	override _getToken0Address = callToken0Function
	override _getToken1Address = callToken1Function
	override _getPoolFactoryAddress = callFactoryFunction

	override _isPeripheryValid(
		periphery: (typeof VELODROME_V2_PERIPHERY)[number][Address],
		poolFactory: Address,
		client: PublicClient,
	): Promise<boolean> {
		return isContractFactoryMatch(
			periphery.router,
			poolFactory,
			client,
			'VELODROME_V2_FACTORY',
		)
	}

	override _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	): ({ router: Address } & object) | undefined {
		return VELODROME_V2_PERIPHERY[chainId]?.[getAddress(poolFactory)]
	}

	override async _create(
		poolAddress: Address,
		chainId: number,
		periphery: { router: Address } & object,
		immutables: PoolConstructorParams['immutables'],
	): Promise<Pool> {
		const client = ClientManager.getClient(chainId)

		const isStable = await client.readContract({
			address: poolAddress,
			abi: VELODROME_V2_POOL_ABI,
			functionName: 'stable',
		})

		const fee = await client.readContract({
			address: immutables.factory,
			abi: VELODROME_V2_FACTORY_ABI,
			functionName: 'getFee',
			args: [poolAddress, isStable],
		})

		const pool = new VelodromeV2Pool(
			{
				immutables,
				poolAddress,
				chainId,
				routerAddress: periphery.router,
			},
			isStable,
			Number(fee),
		)

		return Promise.resolve(pool)
	}
}
