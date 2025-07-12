import { getAddress } from 'viem'
import { ClientManager } from '../../utils/ClientManager'
import {
	callFactoryFunction,
	callFeeFunction,
	callToken0Function,
	callToken1Function,
	isRouterAndQuoterFactoryMatch,
} from '../base/bricks/commonBricks'
import { Pool, PoolConstructorParams } from '../base/Pool'
import { PoolCreator } from '../base/PoolCreator'
import { ALGEBRA_V1_2_PERIPHERY } from './periphery'
import { AlgebraV1_2Pool } from './Pool'

export class AlgebraV1_2PoolCreator extends PoolCreator {
	override _isPeripheryValid = isRouterAndQuoterFactoryMatch
	override _getToken0Address = callToken0Function
	override _getToken1Address = callToken1Function
	override _getPoolFactoryAddress = callFactoryFunction

	override _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	) {
		return ALGEBRA_V1_2_PERIPHERY[chainId]?.[getAddress(poolFactory)]
	}

	override async _create(
		poolAddress: Address,
		chainId: number,
		periphery: (typeof ALGEBRA_V1_2_PERIPHERY)[number][Address],
		immutables: PoolConstructorParams['immutables'],
	): Promise<Pool> {
		const client = ClientManager.getClient(chainId)

		const fee = await callFeeFunction(poolAddress, client)

		return new AlgebraV1_2Pool(
			{
				poolAddress,
				chainId,
				immutables,
				routerAddress: periphery.router,
			},
			fee,
			periphery.quoter,
		)
	}
}
